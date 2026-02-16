/**
 * Project Chat API Route
 * 
 * Handles chat interactions for the Monji Academic Copilot.
 * Uses ToolLoopAgent for multi-step tool execution.
 * 
 * @module app/api/projects/[id]/chat/route
 */

import { createAgentUIStreamResponse } from 'ai';
import { prisma } from '@/lib/prisma';
import { ProjectContextService } from '@/features/builder/services/projectContextService';
import {
    academicAgent,
    buildSystemPrompt,
    type AcademicExecutionContext,
} from '@/lib/agents/academic-agent';
import { MUTATION_TOOLS } from '@/lib/tools';

export const maxDuration = 300;

// ============================================================
// POST: Handle Chat Messages
// ============================================================

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const body = await req.json();
    const { messages, threadId, contextScope } = body;

    console.log(`[Chat API] Request for project ${projectId}. ThreadId: ${threadId || 'NEW'}`);

    // --------------------------------------------------------
    // 1. RESOLVE/CREATE THREAD
    // --------------------------------------------------------

    let activeConversationId = threadId;
    let activeThreadTitle = 'General Chat';

    if (activeConversationId) {
        const thread = await prisma.projectConversation.findUnique({
            where: { id: activeConversationId },
        });

        if (!thread) {
            activeConversationId = null;
        } else {
            activeThreadTitle = thread.threadTitle || 'Chat';
        }
    }

    if (!activeConversationId) {
        const newThread = await prisma.projectConversation.create({
            data: {
                projectId,
                threadType: contextScope ? 'scoped' : 'general',
                contextScope: contextScope || {},
                threadTitle: 'New Conversation',
            },
        });
        activeConversationId = newThread.id;
    }

    // --------------------------------------------------------
    // 2. BUILD CONTEXT
    // --------------------------------------------------------

    const scope = contextScope || {};
    const chapterNumbers = scope.chapterNumbers;

    const context = await ProjectContextService.buildContext(projectId, {
        chapterNumbers,
        includeResearch: scope.includeResearch !== false,
    });

    // Prepare context strings
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

    // --------------------------------------------------------
    // 3. BUILD SYSTEM PROMPT
    // --------------------------------------------------------

    const systemPrompt = buildSystemPrompt({
        topic: context.topic,
        abstract: context.abstract,
        progress: progressCtx,
        chaptersText,
        researchText,
        threadTitle: activeThreadTitle,
    });

    // --------------------------------------------------------
    // 4. PREPARE EXECUTION CONTEXT FOR TOOLS
    // --------------------------------------------------------

    const executionContext: AcademicExecutionContext = {
        projectId,
        conversationId: activeConversationId,
        activeChapterNumber: contextScope?.chapterNumbers?.[0],
        chaptersText,
    };

    // --------------------------------------------------------
    // 5. STREAM RESPONSE VIA AGENT
    // --------------------------------------------------------

    // Return the agent stream response
    return createAgentUIStreamResponse({
        agent: academicAgent,
        uiMessages: messages,

        // Headers
        headers: {
            'x-thread-id': activeConversationId!,
        },

        // Options for the agent call
        options: {
            instructions: systemPrompt,
            experimental_context: executionContext,
        },

        // onFinish callback for persistence
        onFinish: async (event: any) => {
            console.log('[Chat API] onFinish:', {
                hasSteps: !!event.steps,
                stepsCount: event.steps?.length || 0,
            });

            if (!activeConversationId) return;

            // Save user message
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
                        })(),
                    },
                });
            }

            // Extract reasoning if available
            let reasoningText: string | null = null;
            if (event.reasoning && Array.isArray(event.reasoning) && event.reasoning.length > 0) {
                reasoningText = event.reasoning
                    .map((r: any) => r.text || r.content || '')
                    .filter(Boolean)
                    .join('\n');
            }

            // Extract tool invocations from steps
            const toolInvocations: any[] = [];
            if (event.steps && Array.isArray(event.steps)) {
                for (const step of event.steps) {
                    const content = step.content || [];
                    const toolCalls = content.filter((c: any) => c.type === 'tool-call');
                    const toolResults = content.filter((c: any) => c.type === 'tool-result');

                    for (const toolCall of toolCalls) {
                        const matchingResult = toolResults.find(
                            (r: any) => r.toolCallId === toolCall.toolCallId
                        );

                        toolInvocations.push({
                            toolName: toolCall.toolName,
                            args: toolCall.input || toolCall.args,
                            result: matchingResult?.result || matchingResult?.output || matchingResult?.content || null,
                            state: matchingResult ? 'completed' : 'pending',
                        });
                    }
                }
            }

            // Save assistant message
            await prisma.projectChatMessage.create({
                data: {
                    conversationId: activeConversationId,
                    role: 'assistant',
                    content: event.text || '',
                    reasoning: reasoningText || undefined,
                    toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
                },
            });

            // Check for mutation tools to trigger refresh
            const hasMutation = toolInvocations.some(t =>
                MUTATION_TOOLS.includes(t.toolName as any)
            );

            if (hasMutation) {
                console.log('[Chat API] Mutation tool finished, refresh may be needed.');
            }
        },
    });
}


// ============================================================
// GET: Fetch Thread Messages
// ============================================================

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
            reasoning: true,
            toolInvocations: true,
            createdAt: true,
        },
    });

    return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

// ============================================================
// DELETE: Clear Chat History
// ============================================================

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;

        const conversations = await prisma.projectConversation.findMany({
            where: { projectId },
        });

        if (conversations.length > 0) {
            await prisma.projectChatMessage.deleteMany({
                where: {
                    conversationId: { in: conversations.map(c => c.id) },
                },
            });

            await prisma.projectConversation.deleteMany({
                where: { projectId },
            });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        console.error('[Project Chat DELETE] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), {
            status: 500
        });
    }
}
