# Task: Refactor Chat API Route

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 5 - API Route Refactor  
**Priority:** P0 (Critical)  
**Dependencies:** 10_create_academic_agent.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Refactor `src/app/api/projects/[id]/chat/route.ts` to use the new `ToolLoopAgent` and `createAgentUIStreamResponse` pattern instead of the deprecated `streamText` with `maxSteps`.

---

## 🎯 Scope

**In Scope:**
- Replace `streamText` with agent streaming
- Use `createAgentUIStreamResponse` for response
- Remove deprecated `maxSteps` (now handled by agent's `stopWhen`)
- Preserve thread creation/management logic
- Preserve context building logic
- Update `onFinish` callback for message persistence
- Pass `experimental_context` to the agent for tool execution

**Out of Scope:**
- Frontend changes
- Tool changes

---

## 📚 Context

### Current Route Structure (chat/route.ts)
1. Resolve/create thread
2. Build context via `ProjectContextService`
3. Prepare system prompt with context
4. Call `streamText` with tools and `maxSteps: 5`
5. Handle `onFinish` for message persistence
6. Return `toUIMessageStreamResponse()`

### New Pattern
1. Resolve/create thread (same)
2. Build context via `ProjectContextService` (same)
3. Build system prompt with `buildSystemPrompt()` (new helper)
4. Call `academicAgent.stream()` with context
5. Return `createAgentUIStreamResponse()` (new)

---

## 🔧 Implementation

```typescript
// src/app/api/projects/[id]/chat/route.ts
/**
 * Project Chat API Route
 * 
 * Handles chat interactions for the Monji Academic Copilot.
 * Uses ToolLoopAgent for multi-step tool execution.
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
  
  // Convert UI messages to the format expected by the agent
  const coreMessages = messages.map((m: any) => {
    if (typeof m.content === 'string') {
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      };
    }
    
    if (Array.isArray(m.parts)) {
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.parts.map((p: any) => p.text || '').join(''),
      };
    }
    
    return {
      role: m.role as 'user' | 'assistant' | 'system',
      content: '',
    };
  });

  // Return the agent stream response
  return createAgentUIStreamResponse({
    agent: academicAgent,
    uiMessages: messages,
    
    // System prompt
    headers: {
      'x-thread-id': activeConversationId!,
    },
    
    // Options for the agent call
    options: {
      instructions: systemPrompt,
      experimental_context: executionContext,
    },
    
    // onFinish callback for persistence
    onFinish: async (event) => {
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
```

---

## ✅ Definition of Done

- [ ] File refactored to use `createAgentUIStreamResponse`
- [ ] `streamText` with `maxSteps` removed
- [ ] `academicAgent` imported and used
- [ ] `buildSystemPrompt` used for system prompt construction
- [ ] `experimental_context` passed with project context
- [ ] `onFinish` callback updated for new event structure
- [ ] GET and DELETE handlers preserved
- [ ] Thread creation logic preserved
- [ ] Message persistence logic preserved
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/app/api/projects/[id]/chat/route.ts` | Refactored API route |

---

## 🚫 Constraints

- Preserve all existing functionality
- Keep the same message persistence format
- Don't break thread management
- Keep logging for debugging

---

## ⚠️ Potential Issues

### 1. `createAgentUIStreamResponse` Signature
The exact signature may differ. Check the actual AI SDK types:
- May need `uiMessages` instead of `messages`
- May need different options structure

### 2. onFinish Event Structure
The event structure from `ToolLoopAgent` may differ from `streamText`. Verify:
- `event.text` - final text response
- `event.steps` - all steps taken
- `event.reasoning` - reasoning content

### 3. Message Format Compatibility
Ensure the saved message format is compatible with frontend expectations.

---

*Generated by vibe-orchestrator mode*
