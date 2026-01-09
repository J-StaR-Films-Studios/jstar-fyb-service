import { streamText, tool, stepCountIs } from 'ai';
import { prisma } from '@/lib/prisma';
import { MONJI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { ProjectContextService } from '@/features/builder/services/projectContextService';
import { selectModel } from '@/lib/ai';
import { createAcademicTools } from '@/lib/ai/academicTools';


export const maxDuration = 300;

// Validate environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}



export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const body = await req.json();
    const { messages, threadId, contextScope } = body;

    console.log(`[Chat API] Request for project ${projectId}. ThreadId: ${threadId || 'NEW'}`);

    // 1. Resolve Thread
    let activeConversationId = threadId;
    let activeThreadTitle = 'General Chat';

    if (activeConversationId) {
        // Verify thread exists
        const thread = await prisma.projectConversation.findUnique({
            where: { id: activeConversationId }
        });
        if (!thread) {
            // Fallback to creating a new one if not found (robustness)
            activeConversationId = null;
        } else {
            activeThreadTitle = thread.threadTitle || 'Chat';
        }
    }

    if (!activeConversationId) {
        // Create new thread
        const newThread = await prisma.projectConversation.create({
            data: {
                projectId,
                threadType: contextScope ? 'scoped' : 'general',
                contextScope: contextScope || {},
                threadTitle: 'New Conversation'
            }
        });
        activeConversationId = newThread.id;
    }

    // 2. Build Context using Service
    // We prioritize the explicit contextScope passed in the request, 
    // falling back to the thread's saved scope if needed (though request scope usually overrides)
    const scope = contextScope || {};

    // If specific chapters requested (e.g. "Chapter 1 Revisions"), fetch only those
    const chapterNumbers = scope.chapterNumbers;

    const context = await ProjectContextService.buildContext(projectId, {
        chapterNumbers: chapterNumbers,
        includeResearch: scope.includeResearch !== false // Default true
    });

    // 3. Prepare System Prompt Context
    const researchText = context.researchSummaries.length > 0
        ? context.researchSummaries.map(r => `- "${r.title}" (${r.year || 'n.d'}): ${r.summary}`).join('\n')
        : 'No research documents available.';

    const chaptersText = context.chapters.length > 0
        ? context.chapters.map(c => `
## Chapter ${c.number}: ${c.title} (${c.status})
${c.content ? c.content.slice(0, 3000) + (c.content.length > 3000 ? '...[truncated]' : '') : '(No content)'}
`).join('\n')
        : 'No chapters generated yet.';

    const progressCtx = `Completed ${context.currentProgress.completedChapters}/${context.currentProgress.totalChapters} chapters. Next step: ${context.currentProgress.nextRecommendedStep}`;

    const systemPrompt = `${MONJI_SYSTEM_PROMPT}

## Project Context
- **Topic:** ${context.topic}
- **Abstract:** ${context.abstract || 'Pending'}
- **Progress:** ${progressCtx}

## Working Context (Thread: ${activeThreadTitle})
${chaptersText}

## Research Library
${researchText}

## Instructions
1. You are a co-author and writing coach.
2. Use the provided Chapter content and Research Library to answer questions.
3. If the user asks for a revision, use the 'suggestEdit' tool.
4. Be concise but helpful.
5. When using the 'generateDiagram' tool, describe what the diagram should show in detail (nodes, relationships, flow). The system will generate the Mermaid code for you.
6. CRITICAL: When the user asks to "write", "draft", "create", or "generate" content for a chapter, you MUST uses the 'generateSection' tool. Do NOT just write the text in the chat. The 'generateSection' tool is the ONLY way to save the content to the project database.
7. CRITICAL: When you use a tool (like listChapters, searchProjectDocuments), you MUST analyze the return value and provide a helpful natural language summary to the user. Do not stop after the tool runs. Explain what you found.
8. AUTONOMY RULE: If the user asks for a "Full Chapter" or "All Sections", do NOT stop to ask for confirmation after generating the outline. Proceed immediately to generating the sections.
`;

    // 4. Stream Response
    const coreMessages = messages.map((m: any) => {
        // Handle SDK v6 CoreMessage format directly if possible, or convert from UI messages
        // Simple string content
        if (typeof m.content === 'string') {
            return {
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content
            };
        }

        // Parts based content (SDK v6 standard)
        if (Array.isArray(m.parts)) {
            // Filter for text parts for now, as streamText expects valid CoreMessage content
            // Note: core messages for LLMs usually take simple strings or specific array parts.
            // We extract text to be safe or pass struct if model supports it.
            // For strict compliance:
            return {
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.parts.map((p: any) => p.text || '').join('')
            };
        }

        return {
            role: m.role as 'user' | 'assistant' | 'system',
            content: ''
        };
    });

    // Detect if user wants reasoning
    // Detect if user wants reasoning OR if the request implies complex tool usage that benefits from reasoning
    const lastUserMessage = coreMessages
        .slice().reverse().find((m: any) => m.role === 'user')?.content || '';

    // Expanded trigger words to include tool actions which need diligent output processing
    const wantsReasoning = /think|reason|why|explain|analyze|compare|critique|list|search|find|load|generate|create|add|suggest|draw|sketch|diagram/i.test(lastUserMessage);

    // Use smart routing to pick the best model
    const { model, modelId, provider, isFree, reason } = selectModel({
        tools: true,
        reasoning: wantsReasoning, // Dynamic switching
        quality: 'high'
    });

    console.log(`[Chat API] Using model: ${modelId} via ${provider} (Free: ${isFree}) - ${reason} (Reasoning Requested: ${wantsReasoning})`);

    // For OpenRouter reasoning models, we pass the reasoning config via providerOptions
    // The reasoning content comes back in a separate 'reasoning' field on the response
    const result = streamText({
        model,
        system: systemPrompt, // No need for forced <think> tags - OpenRouter handles reasoning
        messages: coreMessages as any,
        // @ts-ignore
        maxSteps: 15, // Allow multiple tool steps (Increased to 15 for bulk operations)
        // Pass reasoning config to OpenRouter when requested
        ...(wantsReasoning && provider === 'openrouter' ? {
            providerOptions: {
                openrouter: {
                    reasoning: {
                        effort: 'high', // high effort for detailed reasoning
                        // exclude: false // include reasoning in response (default)
                    }
                }
            }
        } : {}),
        // Pass reasoning config to OpenRouter when requested
        ...(wantsReasoning && provider === 'openrouter' ? {
            providerOptions: {
                openrouter: {
                    reasoning: {
                        effort: 'high', // high effort for detailed reasoning
                        // exclude: false // include reasoning in response (default)
                    }
                }
            }
        } : {}),

        // Use centralized tool definitions
        tools: createAcademicTools(projectId, activeConversationId, {
            chaptersText
        }) as any,
        onFinish: async ({ text, reasoning, steps }: { text: string; reasoning?: any[]; steps?: any[] }) => {
            console.log('[Chat API] onFinish called:', {
                textLength: text?.length || 0,
                hasReasoning: !!reasoning,
                hasSteps: !!steps,
                stepsCount: steps?.length || 0,
                stepsPreview: steps ? JSON.stringify(steps).substring(0, 500) : 'no steps'
            });

            // Save messages to the resolved thread ID
            if (activeConversationId) {
                const userMsg = messages[messages.length - 1];
                if (userMsg?.role === 'user') {
                    await prisma.projectChatMessage.create({
                        data: {
                            conversationId: activeConversationId,
                            role: 'user',
                            content: (() => {
                                if (typeof userMsg.content === 'string' && userMsg.content) return userMsg.content;
                                if (Array.isArray(userMsg.parts)) {
                                    return userMsg.parts.map((p: any) => p.text || '').join('');
                                }
                                return '';
                            })()
                        }
                    });
                }

                // Extract reasoning text from the reasoning array
                // SDK returns reasoning as an array of {type: 'reasoning', text: '...'} objects
                let reasoningText: string | null = null;
                if (reasoning && Array.isArray(reasoning) && reasoning.length > 0) {
                    reasoningText = reasoning
                        .map((r: any) => r.text || r.content || '')
                        .filter(Boolean)
                        .join('\n');
                }

                // Extract tool invocations from steps for persistence
                // SDK v6 structure: step.content[] contains objects with type: 'tool-call' and 'tool-result'
                let toolInvocations: any[] = [];
                if (steps && Array.isArray(steps)) {
                    for (const step of steps) {
                        const content = step.content || [];
                        // Find all tool calls and their results
                        const toolCalls = content.filter((c: any) => c.type === 'tool-call');
                        const toolResults = content.filter((c: any) => c.type === 'tool-result');

                        for (const toolCall of toolCalls) {
                            // Find matching result by toolCallId
                            const matchingResult = toolResults.find((r: any) => r.toolCallId === toolCall.toolCallId);
                            toolInvocations.push({
                                toolName: toolCall.toolName,
                                args: toolCall.input || toolCall.args,
                                // Check for result in multiple possible properties
                                result: matchingResult?.result || matchingResult?.output || matchingResult?.content || null,
                                state: matchingResult ? 'completed' : 'pending'
                            });
                        }
                    }
                }

                await prisma.projectChatMessage.create({
                    data: {
                        conversationId: activeConversationId,
                        role: 'assistant',
                        content: text,
                        reasoning: reasoningText || undefined,
                        toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined
                    }
                });
            }
        }
    } as any);

    return (result as any).toUIMessageStreamResponse({
        sendReasoning: true, // Include OpenRouter reasoning in stream
        headers: {
            'x-thread-id': activeConversationId!
        }
    });
}

// DELETE: Clear project chat history

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }

    const messages = await prisma.projectChatMessage.findMany({
        where: { conversationId: threadId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            role: true,
            content: true,
            reasoning: true, // Include reasoning for AI messages
            toolInvocations: true,
            createdAt: true
        }
    });

    return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;

        // Find and delete all project conversations and messages
        const conversations = await prisma.projectConversation.findMany({
            where: { projectId }
        });

        if (conversations.length > 0) {
            // Delete messages first, then conversations
            await prisma.projectChatMessage.deleteMany({
                where: {
                    conversationId: { in: conversations.map(c => c.id) }
                }
            });
            await prisma.projectConversation.deleteMany({
                where: { projectId }
            });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        console.error('[Project Chat DELETE] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), { status: 500 });
    }
}
