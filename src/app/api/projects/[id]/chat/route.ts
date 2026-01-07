import { streamText, tool, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { MONJI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { ProjectContextService } from '@/features/builder/services/projectContextService';


export const maxDuration = 300;

// Validate environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}

// Create Gemini provider using the AI SDK
const google = createGoogleGenerativeAI({
    apiKey: geminiApiKey,
});

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
`;

    // 4. Stream Response
    const coreMessages = messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: typeof m.content === 'string' ? m.content : (m.parts?.find((p: any) => p.type === 'text')?.text || '')
    }));

    const result = streamText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        messages: coreMessages as any,
        // @ts-ignore
        maxSteps: 5, // Allow multiple tool steps
        tools: {
            searchProjectDocuments: tool({
                description: `Search the full text of uploaded research documents.`,
                parameters: z.object({
                    query: z.string(),
                }),
                execute: async ({ query }: { query: string }) => {
                    const project = await prisma.project.findUnique({
                        where: { id: projectId },
                        select: { fileSearchStoreId: true }
                    });

                    if (!project?.fileSearchStoreId) return "No research library index found.";

                    const result = await GeminiFileSearchService.generateWithGrounding(
                        query,
                        [project.fileSearchStoreId]
                    );
                    return `Found in documents:\n${result.text}\nSOURCES: ${JSON.stringify(result.groundingChunks)}`;
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
        onFinish: async ({ text }: { text: string }) => {
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
                await prisma.projectChatMessage.create({
                    data: {
                        conversationId: activeConversationId,
                        role: 'assistant',
                        content: text
                    }
                });
            }
        }
    } as any);

    return result.toUIMessageStreamResponse({
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
