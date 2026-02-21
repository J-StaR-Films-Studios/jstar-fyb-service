/**
 * Project Chat API Route
 * 
 * Handles chat interactions for the Monji Academic Copilot.
 * Uses ToolLoopAgent for multi-step tool execution.
 * 
 * @module app/api/projects/[id]/chat/route
 */

import { createAgentUIStreamResponse, generateId } from 'ai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-server';
import { ProjectContextService } from '@/features/builder/services/projectContextService';
import {
    academicAgent,
    buildSystemPrompt,
    type AcademicExecutionContext,
} from '@/lib/agents/academic-agent';
import { MUTATION_TOOLS } from '@/lib/tools';
import { validateChatRequest } from '@/lib/validation/chat';

export const maxDuration = 300;

// ============================================================
// POST: Handle Chat Messages
// ============================================================

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    // --------------------------------------------------------
    // 0. AUTHENTICATION CHECK
    // --------------------------------------------------------

    const session = await getSession();

    if (!session?.user?.id) {
        return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { id: projectId } = await params;

    // --------------------------------------------------------
    // 0.5. AUTHORIZATION CHECK
    // --------------------------------------------------------

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) {
        return new Response(
            JSON.stringify({ error: 'Project not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (project.userId !== session.user.id) {
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // --------------------------------------------------------
    // 1. VALIDATE REQUEST BODY
    // --------------------------------------------------------

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ error: 'Invalid JSON in request body' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const validation = validateChatRequest(body);

    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: 'Validation failed', details: validation.error }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { messages: rawMessages, threadId, contextScope } = validation.data;

    // --------------------------------------------------------
    // 2. RESOLVE/CREATE THREAD
    // --------------------------------------------------------

    // FIX: Simplified message sanitization
    // Strip all tool parts from history messages — only keep text parts.
    // The AI doesn't need old tool results in message history; they cause round-trip validation errors.
    const messages = rawMessages.map(m => {
        const textParts: any[] = [];

        // Extract text from content string if present
        if (typeof m.content === 'string' && m.content) {
            textParts.push({ type: 'text', text: m.content });
        }

        // Also extract text from parts array (for DB-loaded messages with parts format)
        if (Array.isArray(m.parts)) {
            for (const p of m.parts) {
                if (p.type === 'text' && p.text) {
                    textParts.push({ type: 'text', text: p.text });
                }
                // Note: tool parts are intentionally stripped
            }
        }

        return {
            id: m.id || generateId(),
            role: m.role,
            content: typeof m.content === 'string' ? m.content : undefined,
            parts: textParts.length > 0 ? textParts : undefined,
        };
    });

    console.log(`[Chat API] Request for project ${projectId}. ThreadId: ${threadId || 'NEW'}`);

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
    // 3. BUILD CONTEXT
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
    // 4. BUILD SYSTEM PROMPT
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
    // 5. PREPARE EXECUTION CONTEXT FOR TOOLS
    // --------------------------------------------------------

    const executionContext: AcademicExecutionContext = {
        projectId,
        conversationId: activeConversationId,
        activeChapterNumber: contextScope?.chapterNumbers?.[0],
        chaptersText,
    };

    // --------------------------------------------------------
    // 6. STREAM RESPONSE VIA AGENT
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
        // NOTE: This is UIMessageStreamOnFinishCallback, NOT StreamTextOnFinishCallback.
        // It receives { messages, responseMessage, isContinuation, isAborted, finishReason }
        onFinish: async (event: any) => {
            console.log('[Chat API] onFinish:', {
                hasResponseMessage: !!event.responseMessage,
                partsCount: event.responseMessage?.parts?.length || 0,
                isAborted: event.isAborted,
            });

            if (!activeConversationId || event.isAborted) return;

            // Save user message
            const userMsg = messages[messages.length - 1];
            if (userMsg?.role === 'user') {
                const textContent = typeof userMsg.content === 'string' && userMsg.content
                    ? userMsg.content
                    : Array.isArray(userMsg.parts)
                        ? userMsg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('')
                        : '';

                await prisma.projectChatMessage.create({
                    data: {
                        conversationId: activeConversationId,
                        role: 'user',
                        content: textContent,
                    },
                });
            }

            // Extract data from the assistant's UIMessage response parts
            const responseParts: any[] = event.responseMessage?.parts || [];

            // 1. Extract text content from TextUIPart entries
            const assistantText = responseParts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => p.text || '')
                .filter(Boolean)
                .join('\n\n');

            // 2. Extract reasoning from ReasoningUIPart entries
            const reasoningText = responseParts
                .filter((p: any) => p.type === 'reasoning')
                .map((p: any) => p.text || '')
                .filter(Boolean)
                .join('\n') || null;

            // 3. Extract tool invocations from ToolUIPart entries (type: 'tool-{toolName}')
            const toolInvocations: any[] = [];
            for (const part of responseParts) {
                // ToolUIPart has type starting with 'tool-' and a toolName property
                if (part.type?.startsWith('tool-') && part.toolName) {
                    toolInvocations.push({
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        args: part.input || {},
                        result: part.output || null,
                        state: part.state === 'output-available' ? 'completed' : 'pending',
                    });
                }
            }

            // Save assistant message
            await prisma.projectChatMessage.create({
                data: {
                    conversationId: activeConversationId,
                    role: 'assistant',
                    content: assistantText,
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
    // --------------------------------------------------------
    // 0. AUTHENTICATION CHECK
    // --------------------------------------------------------

    const session = await getSession();

    if (!session?.user?.id) {
        return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { id: projectId } = await params;

    // --------------------------------------------------------
    // 0.5. AUTHORIZATION CHECK
    // --------------------------------------------------------

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) {
        return new Response(
            JSON.stringify({ error: 'Project not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (project.userId !== session.user.id) {
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }

    const dbMessages = await prisma.projectChatMessage.findMany({
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

    // Transform database messages to AI SDK v6 'parts' format
    const messages = dbMessages.map(m => {
        const parts: any[] = [];

        // 1. Add reasoning part
        if (m.reasoning) {
            parts.push({ type: 'reasoning', text: m.reasoning });
        }

        // 2. Add text part
        if (m.content) {
            parts.push({ type: 'text', text: m.content });
        }

        // 3. Add tool parts
        if (m.toolInvocations && Array.isArray(m.toolInvocations)) {
            m.toolInvocations.forEach((tool: any) => {
                parts.push({
                    type: `tool-${tool.toolName}`,
                    toolName: tool.toolName,
                    toolCallId: tool.toolCallId,
                    state: tool.state === 'completed' ? 'output-available' : 'input-available',
                    input: tool.args || {},
                    output: tool.result,
                });
            });
        }

        return {
            ...m,
            parts,
        };
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
    // --------------------------------------------------------
    // 0. AUTHENTICATION CHECK
    // --------------------------------------------------------

    const session = await getSession();

    if (!session?.user?.id) {
        return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { id: projectId } = await params;

    // --------------------------------------------------------
    // 0.5. AUTHORIZATION CHECK
    // --------------------------------------------------------

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) {
        return new Response(
            JSON.stringify({ error: 'Project not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (project.userId !== session.user.id) {
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
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
