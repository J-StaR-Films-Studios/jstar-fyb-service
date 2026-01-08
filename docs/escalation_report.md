# Escalation Handoff Report

**Generated:** 2026-01-08T20:58:00Z
**Original Issue:** `generateDiagram` tool execution works on backend but result does not appear in Frontend UI.

---

## PART 1: THE DAMAGE REPORT

### 1.1 Original Goal
The user wanted the AI to generate Mermaid diagrams (flowcharts) in the chat. The user would prompt "Generate a flowchart...", the AI should call the `generateDiagram` tool, and the UI should render the diagram card.

### 1.2 Observed Failure
1.  **Backend Success**: The AI calls the tool. After fixing parameter hallucination (see below), the logs confirm the tool executes successfully and returns valid Mermaid code.
    ```
    [Chat API] Tool Executed: generateDiagram {
      mermaidCode: 'flowchart TD...'
    }
    ```
2.  **Frontend Failure**: The UI remains blank or shows a dark empty text box. The `AcademicCopilot.tsx` component fails to detect the `generateDiagram` tool result in the incoming stream.
3.  **No Crash**: There are no console errors, just silent failure to render the specific tool result.

### 1.3 Failed Approach
1.  **Backend Fixes (Retained)**:
    -   Modified `route.ts` to handle AI parameter hallucination. The model was sending `content`, `diagram`, or `code` instead of `mermaidCode`. Added fallback logic to catch all these.
    -   Added explicit system prompt instructions to force the model to send code, not descriptions.
    -   **Status**: This part WORKS. The backend is solid.

2.  **Frontend Fixes (Failed & Reverted)**:
    -   Attempted to add `console.log` to `AcademicCopilot` to trace `messages`.
    -   Attempted "brute force" search in `findToolResult` to scan all `parts` and `toolInvocations` for any object containing `mermaidCode`.
    -   **Outcome**: Even with brute force, the code could not find the result. This suggests a fundamental disconnect in how `useChat` (AI SDK v6) is receiving/parsing the stream from `toUIMessageStreamResponse`.

### 1.4 Key Files Involved
-   `src/app/api/projects/[id]/chat/route.ts` (Backend - **Modified & Working**)
-   `src/features/builder/components/v2/AcademicCopilot.tsx` (Frontend - **Reverted to clean state**, usage logic suspect)

### 1.5 Best-Guess Diagnosis
The issue is likely a mismatch between the **backend response format** and the **frontend consumption hook**.
-   **Backend**: Uses `(result as any).toUIMessageStreamResponse()`. This is an older/compatibility method or specific to Vercel AI SDK v6 beta features.
-   **Frontend**: Uses `useChat` from `@ai-sdk/react`.
-   **Hypothesis**: The `toUIMessageStreamResponse` might be sending tool results in a distinct `part` type that `useChat`'s standard `toolInvocations` property does not populate automatically, OR the `toDataStreamResponse` (which is standard for v6) should be used instead. The previous agent tried `toDataStreamResponse` but hit a TypeScript error/Runtime crash.
-   **Next Step**: The Orchestrator needs to standardize the streaming protocol. Check if `toDataStreamResponse` is available and compatible, or write a custom frontend parser for the specific stream format being sent.

---

## PART 2: FULL FILE CONTENTS (Self-Contained)

### File: `src/app/api/projects/[id]/chat/route.ts`
(Note: This file contains the fixes for parameter hallucination)
```typescript
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
```

### File: `src/features/builder/components/v2/AcademicCopilot.tsx`
(Reverted to clean state - contains logic that fails to find the tool result)
```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
// ... imports ...

export function AcademicCopilot({ projectId, activeChapterId, activeChapterNumber, onClose, onApplyEdit, onInsertDiagram }: AcademicCopilotProps) {
    // ... state setup ...

    // Chat Hook
    const { messages, sendMessage: chatSendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({ api: `/api/projects/${projectId}/chat` }),
        id: `academic-copilot-${projectId}-${stableThreadId}`, 
        onError: (error) => {
            console.error("Chat error:", error);
        }
    });

    // Handle tool invocations from messages (v6 compatible)
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant') {
            const parts = (lastMessage as any).parts || [];
            const toolInvocations = (lastMessage as any).toolInvocations || [];

            // Helper to find tool result in either parts or toolInvocations
            const findToolResult = (toolName: string) => {
                // Check toolInvocations (standard SDK struct)
                const invocation = toolInvocations.find((t: any) => t.toolName === toolName);
                if (invocation && 'result' in invocation) return invocation.result;

                // Check parts (legacy/alternative struct)
                const part = parts.find((p: any) =>
                    p.type === 'tool-invocation' && p.toolInvocation?.toolName === toolName
                );
                if (part?.toolInvocation?.result) return part.toolInvocation.result;

                return null;
            };

            // Handle Suggest Edit
            const editResult = findToolResult('suggestEdit');
            if (editResult) {
                setSuggestion(editResult);
            }

            // Handle Generate Diagram
            const diagramResult = findToolResult('generateDiagram');
            if (diagramResult) {
                setDiagramSuggestion(diagramResult);
            }
        }
    }, [messages]);

    // ... render logic ...
}
```

---

## PART 3: DIRECTIVE FOR ORCHESTRATOR

**Attention: Senior AI Orchestrator**

The **Backend** is fixed (it correctly fields the AI tool call, handles varying parameter names, and returns a result).
The **Frontend** is failing to "see" that result.

**Your Protocol:**

1.  **Analyze the Stream**: The previous agent utilized `toUIMessageStreamResponse`. Verify if this v6 method creates a stream structure incompatible with the `useChat` hook implementation in this codebase.
2.  **Standardize**: Consider migrating the backend to `toDataStreamResponse` (Vercel AI SDK v6 standard) AND fixing whatever Type/Runtime error prevented it earlier. (hint: ensure `ai` package version is consistent).
3.  **Debug Client**: If `toUIMessageStreamResponse` is kept, you must audit exactly what the browser receives. The previous agent's logs (now reverted) showed that `findToolResult` was returning null, implying the data is either not there or nested differently.

**Goal**: Get the `generateDiagram` result from `route.ts` to appear in `AcademicCopilot.tsx`'s state so the `DiagramSuggestionCard` renders.
