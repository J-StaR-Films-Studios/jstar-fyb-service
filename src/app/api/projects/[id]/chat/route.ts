import { streamText, tool, stepCountIs } from 'ai';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { MONJI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { ProjectContextService } from '@/features/builder/services/projectContextService';
import { selectModel } from '@/lib/ai';


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
5. When using the 'generateDiagram' tool, you MUST provide the raw valid MermaidJS code string in the 'mermaidCode' (or 'code') parameter. Do not just describe the diagram.
`;

    // 4. Stream Response
    const coreMessages = messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: typeof m.content === 'string' ? m.content : (m.parts?.find((p: any) => p.type === 'text')?.text || '')
    }));

    // Detect if user wants reasoning
    const lastUserMessage = coreMessages
        .slice().reverse().find((m: any) => m.role === 'user')?.content || '';

    const wantsReasoning = /think|reason|why|explain|analyze|compare|critique/i.test(lastUserMessage);

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
        maxSteps: 5, // Allow multiple tool steps
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
        tools: {
            searchProjectDocuments: tool({
                description: `Search the full text of uploaded research documents.`,
                parameters: z.object({
                    query: z.string(),
                }),
                execute: async ({ query }: { query: string }) => {
                    try {
                        const project = await prisma.project.findUnique({
                            where: { id: projectId },
                            select: { fileSearchStoreId: true }
                        });

                        if (!project?.fileSearchStoreId) {
                            return "I cannot search documents because no research library has been created for this project. Please upload documents first.";
                        }

                        const result = await GeminiFileSearchService.generateWithGrounding(
                            query,
                            [project.fileSearchStoreId]
                        );
                        return `Found in documents:\n${result.text}\nSOURCES: ${JSON.stringify(result.groundingChunks)}`;
                    } catch (error: any) {
                        console.error('[Chat Tool] Search failed:', error);
                        // Return error as string so the AI knows it failed but chat continues
                        return `Search failed: ${error.message || 'Unknown error'}. Please ignore this tool result.`;
                    }
                }
            } as any),
            suggestEdit: tool({
                description: `Suggest a specific content revision for a chapter or section. Use this when the user asks to "rewrite", "improve", "fix", or "change" specific text.`,
                parameters: z.object({
                    chapterNumber: z.number().describe('The chapter number to edit'),
                    currentContentToReplace: z.string().describe('The EXACT text snippet to be replaced (must match existing text)'),
                    newContent: z.string().describe('The proposed new content'),
                    explanation: z.string().describe('Brief reason for the change'),
                }),
                execute: async ({ chapterNumber, currentContentToReplace, newContent, explanation }: { chapterNumber: number; currentContentToReplace: string; newContent: string; explanation: string }) => {
                    console.log(`[Chat API] Tool Executed: suggestEdit`, { chapterNumber, explanation });
                    // We don't apply it here, just return the structured suggestion for the UI to render
                    return {
                        tool: 'suggestEdit',
                        chapterNumber,
                        original: currentContentToReplace,
                        replacement: newContent,
                        explanation
                    };
                }
            } as any),
            generateDiagram: tool({
                description: `Generate a Mermaidjs diagram (flowchart, sequence, class, etc) based on the user's request. Return the mermaid code directly.`,
                parameters: z.object({
                    title: z.string().describe('A short title for the diagram'),
                    type: z.enum(['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'mindmap']).describe('The type of diagram to generate'),
                    mermaidCode: z.string().describe('The complete Mermaid.js code for the diagram. Do not wrap in markdown code blocks.'),
                    explanation: z.string().describe('Brief explanation of what the diagram shows'),
                }),
                execute: async (args: any) => {
                    console.log(`[Chat API] Tool Executed: generateDiagram`, args);

                    // Handle variable parameter names (model hallucination fix)
                    const title = args.title || 'Untitled Diagram';
                    const type = args.type || 'flowchart';
                    const explanation = args.explanation || 'Generated by AI';

                    // The model often sends 'content', 'code', or 'diagram' instead of 'mermaidCode'
                    // We also check 'description' if it looks like code, but usually 'description' is natural text (failure case)
                    const mermaidCode = args.mermaidCode || args.code || args.content || args.diagram || args.graph;

                    // Validation for free models that might return partial/malformed JSON
                    if (!mermaidCode) {
                        // Return a helpful error to the model to prompt a retry
                        return "ERROR: You failed to generate the actual MermaidJS code. You provided a description but no code. Please RETRY and provide the valid MermaidJS string in the 'code' parameter.";
                    }

                    return {
                        tool: 'generateDiagram',
                        title,
                        type,
                        mermaidCode,
                        explanation
                    };
                }
            } as any),
            saveUserContext: tool({
                description: `Save user details like department, course, or institution.`,
                parameters: z.object({
                    department: z.string().optional(),
                    course: z.string().optional(),
                    institution: z.string().optional(),
                }),
                execute: async (data: { department?: string; course?: string; institution?: string }) => {
                    await prisma.project.update({
                        where: { id: projectId },
                        data: { ...data, contextComplete: true }
                    });
                    return "Context saved.";
                }
            } as any)
        } as any,
        onFinish: async ({ text, reasoning }: { text: string; reasoning?: any[] }) => {
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

                await prisma.projectChatMessage.create({
                    data: {
                        conversationId: activeConversationId,
                        role: 'assistant',
                        content: text,
                        reasoning: reasoningText || undefined
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
