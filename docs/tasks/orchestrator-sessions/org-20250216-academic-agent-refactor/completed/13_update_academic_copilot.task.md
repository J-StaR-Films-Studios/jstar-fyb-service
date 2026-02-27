# Task: Update AcademicCopilot Component

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 6 - Frontend Updates  
**Priority:** P0  
**Dependencies:** 11_refactor_chat_api_route.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Update `src/features/builder/components/v2/AcademicCopilot.tsx` to use the new typed `AcademicUIMessage` type and handle the updated tool result structure.

---

## 🎯 Scope

**In Scope:**
- Import and use `AcademicUIMessage` type from agent
- Update `useChat` hook with type parameter
- Update tool invocation handling for new result structure
- Handle `ToolSuccess`/`ToolError` wrapper
- Update `onFinish` mutation detection

**Out of Scope:**
- Message bubble rendering (separate task)
- Tool result cards (separate task)

---

## 📚 Context

### AI SDK v6 useChat Changes (from common-errors.md)

```typescript
// ✅ Correct
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

const [input, setInput] = useState('');
const { sendMessage } = useChat<TypedUIMessage>({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
```

### New Tool Result Structure

Tools now return `ToolResult<T>`:
```typescript
interface ToolSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface ToolError {
  success: false;
  error: string;
  details?: unknown;
}
```

Frontend needs to access `part.output.data` instead of `part.output` directly.

---

## 🔧 Implementation

```typescript
// src/features/builder/components/v2/AcademicCopilot.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BrainCircuit, Send, Sparkles, FileText, AlertCircle,
  Loader2, Quote, ArrowRight, ChevronDown, Layout,
  Trash2, MessageSquare, ChevronLeft
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThreadSelector } from './ThreadSelector';
import { toast } from 'sonner';
import { PERSONALITIES } from '@/features/bot/prompts/system';
import { AcademicMessageBubble } from './AcademicMessageBubble';

// Import the typed message from the agent
import type { AcademicUIMessage } from '@/lib/agents/academic-agent';
import { MUTATION_TOOLS } from '@/lib/tools';

interface AcademicCopilotProps {
  projectId: string;
  activeChapterId?: string;
  activeChapterNumber?: number;
  onClose?: () => void;
  onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
  onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
  onToolCompleted?: () => void;
}

export function AcademicCopilot({ 
  projectId, 
  activeChapterId, 
  activeChapterNumber, 
  onClose, 
  onApplyEdit, 
  onInsertDiagram, 
  onToolCompleted 
}: AcademicCopilotProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // URL param handling for thread persistence
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlThreadId = searchParams.get('thread');

  // State
  const [activeThreadId, setActiveThreadId] = useState<string | null>(urlThreadId);
  const [lastKnownThread, setLastKnownThread] = useState<{ id: string; title: string } | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  // Avatar cycling state
  const [showAI, setShowAI] = useState(false);
  const cycleTimings = [3000, 5000, 5000, 10000];
  const cycleIndexRef = useRef(0);

  // Input state (managed manually per AI SDK v6)
  const [input, setInput] = useState('');

  // Sync state to ref for access inside closures
  const activeThreadIdRef = useRef(activeThreadId);
  useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);

  // Update URL when activeThreadId changes
  const updateUrlWithThread = useCallback((threadId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (threadId) {
      params.set('thread', threadId);
    } else {
      params.delete('thread');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [searchParams]);

  // Fetch last known thread on mount
  useEffect(() => {
    const fetchLastThread = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/threads`);
        const data = await res.json();
        if (data.success && data.threads?.length > 0) {
          const mostRecent = data.threads[0];
          setLastKnownThread({ id: mostRecent.id, title: mostRecent.threadTitle });
        }
      } catch (e) {
        console.error("Failed to fetch threads", e);
      } finally {
        setIsLoadingThreads(false);
      }
    };
    fetchLastThread();
  }, [projectId]);

  // Stable thread ID for useChat
  const [stableThreadId] = useState(urlThreadId || 'new');

  // ============================================================
  // TYPED useChat HOOK
  // ============================================================
  
  const { messages, sendMessage: chatSendMessage, status, setMessages } = useChat<AcademicUIMessage>({
    transport: new DefaultChatTransport({ api: `/api/projects/${projectId}/chat` }),
    id: `academic-copilot-${projectId}-${stableThreadId}`,
    
    onFinish: (message) => {
      // Check for mutation tools to trigger refresh
      const hasMutation = message.parts.some(part => {
        if (isToolUIPart(part)) {
          return MUTATION_TOOLS.includes(part.toolName as any);
        }
        return false;
      });

      if (hasMutation && onToolCompleted) {
        console.log("[AcademicCopilot] Mutation tool finished, triggering refresh.");
        onToolCompleted();
      }
    },
  });

  // ... rest of the component logic ...

  // Auto-load messages when mounting with a URL thread param
  const hasLoadedUrlThread = useRef(false);
  useEffect(() => {
    if (urlThreadId && !hasLoadedUrlThread.current && !isLoadingThreads) {
      hasLoadedUrlThread.current = true;
      (async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/chat?threadId=${urlThreadId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages) {
              // Convert DB messages to UI message format
              const uiMessages = data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                parts: [{ type: 'text', text: m.content }],
                createdAt: m.createdAt,
              }));
              setMessages(uiMessages);
            }
          }
        } catch (e) {
          console.error("Failed to load URL thread messages", e);
        }
      })();
    }
  }, [urlThreadId, isLoadingThreads, projectId, setMessages]);

  // Auto-scroll
  const requestRef = useRef<number | null>(null);
  const scrollToBottom = (instant = false) => {
    if (!scrollRef.current) return;
    const target = scrollRef.current;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (instant || isAtBottom) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        target.scrollTop = target.scrollHeight;
      });
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Send message wrapper
  const sendMessage = async (payload: { text: string }) => {
    let currentThreadId = activeThreadIdRef.current;

    // Pre-create thread if needed
    if (!currentThreadId) {
      try {
        const contextScope = activeChapterNumber ? { chapterNumbers: [activeChapterNumber] } : {};
        const res = await fetch(`/api/projects/${projectId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'general',
            title: payload.text.slice(0, 30) || 'New Conversation',
            contextScope,
          }),
        });
        const data = await res.json();
        if (data.success && data.thread) {
          currentThreadId = data.thread.id;
          setActiveThreadId(currentThreadId);
          updateUrlWithThread(currentThreadId);
          activeThreadIdRef.current = currentThreadId;
          hasLoadedUrlThread.current = true;
        }
      } catch (e) {
        console.error("Failed to pre-create thread", e);
      }
    }

    await chatSendMessage({ text: payload.text }, {
      body: {
        threadId: currentThreadId,
        contextScope: activeChapterNumber ? { chapterNumbers: [activeChapterNumber] } : {},
      },
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input;
    setInput('');
    await sendMessage({ text: userMessage });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  // Avatar animation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isLoading) return;
    const cycle = () => {
      setShowAI(prev => !prev);
      cycleIndexRef.current = (cycleIndexRef.current + 1) % cycleTimings.length;
      const nextDelay = cycleTimings[cycleIndexRef.current];
      timeoutId = setTimeout(cycle, nextDelay);
    };
    timeoutId = setTimeout(cycle, cycleTimings[0]);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [isLoading]);

  // Thread management callbacks
  const handleThreadSelect = async (threadId: string | null) => {
    setActiveThreadId(threadId);
    updateUrlWithThread(threadId);
    if (threadId) hasLoadedUrlThread.current = true;
    if (threadId) {
      setMessages([]);
      // Load messages...
      try {
        const res = await fetch(`/api/projects/${projectId}/chat?threadId=${threadId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            const uiMessages = data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              parts: [{ type: 'text', text: m.content }],
              createdAt: m.createdAt,
            }));
            setMessages(uiMessages);
          }
        }
      } catch (error) {
        console.error("Failed to load thread messages", error);
      }
    } else {
      setMessages([]);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="flex flex-col h-full bg-dark/20 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 z-30 bg-zinc-950/95 backdrop-blur-md shadow-sm">
        {/* ... header content ... */}
      </div>

      {/* Chat Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-48 space-y-6 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            /* Empty State */
            <motion.div>
              {/* ... empty state content ... */}
            </motion.div>
          ) : (
            /* Messages */
            messages.map((message) => (
              <AcademicMessageBubble 
                key={message.id} 
                message={message}
                onApplyEdit={onApplyEdit}
                onInsertDiagram={onInsertDiagram}
              />
            ))
          )}

          {isLoading && (
            <motion.div className="flex justify-start w-full">
              <div className="bg-white/5 rounded-2xl rounded-bl-none px-4 py-3 border border-white/5 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 pb-2 md:pb-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark via-dark/80 to-transparent pt-12">
        {/* ... input form ... */}
      </div>
    </div>
  );
}
```

---

## ✅ Definition of Done

- [ ] `AcademicUIMessage` type imported and used
- [ ] `useChat<AcademicUIMessage>` properly typed
- [ ] `isToolUIPart` used for type-safe tool part checking
- [ ] `MUTATION_TOOLS` used for mutation detection
- [ ] Manual input state management (AI SDK v6 pattern)
- [ ] `onFinish` updated for new message structure
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/features/builder/components/v2/AcademicCopilot.tsx` | Updated component |

---

## 🚫 Constraints

- Preserve all existing functionality
- Keep thread management logic
- Don't break the UI layout

---

*Generated by vibe-orchestrator mode*
