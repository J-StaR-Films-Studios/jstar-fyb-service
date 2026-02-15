# Task: Update AcademicMessageBubble Component

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 6 - Frontend Updates  
**Priority:** P1  
**Dependencies:** 13_update_academic_copilot.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Update `src/features/builder/components/v2/AcademicMessageBubble.tsx` to handle the new typed message parts and tool result structure.

---

## 🎯 Scope

**In Scope:**
- Use typed `AcademicUIMessage` for message prop
- Handle `tool-{toolName}` part types (AI SDK v6 pattern)
- Handle `ToolSuccess`/`ToolError` wrapper in tool outputs
- Access `part.output.data` for tool results
- Update state checking (`input-streaming`, `input-available`, `output-available`)

**Out of Scope:**
- Tool result card components (separate task)
- AcademicCopilot changes

---

## 📚 Context

### AI SDK v6 Message Part Patterns (from common-errors.md)

```typescript
// ✅ Correct - using typed tool parts
message.parts.map(part => {
  switch (part.type) {
    case 'text':
      return part.text;
    case 'tool-suggestEdit':
      if (part.state === 'output-available') {
        // part.input and part.output are fully typed
        return <EditCard data={part.output} />;
      }
      return <LoadingState />;
    // ... other tools
  }
});
```

### State Names
- `'input-streaming'` - Tool call is being streamed
- `'input-available'` - Tool call is ready to execute
- `'output-available'` - Tool has finished execution

### New Tool Output Structure
Tools return `ToolResult<T>`:
```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, error: string, details?: unknown }
```

---

## 🔧 Implementation

```typescript
// src/features/builder/components/v2/AcademicMessageBubble.tsx
'use client';

import { motion } from 'framer-motion';
import { User, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToolUIPart } from 'ai';
import type { AcademicUIMessage } from '@/lib/agents/academic-agent';
import { ToolResultCard } from './ToolResultCard';

interface AcademicMessageBubbleProps {
  message: AcademicUIMessage;
  onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
  onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
}

export function AcademicMessageBubble({ 
  message, 
  onApplyEdit, 
  onInsertDiagram 
}: AcademicMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "max-w-[85%] space-y-2",
        isUser ? "order-first" : ""
      )}>
        {message.parts.map((part, index) => {
          // Handle text parts
          if (part.type === 'text') {
            return (
              <div
                key={`${message.id}-text-${index}`}
                className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  isUser
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white/5 text-white border border-white/5 rounded-bl-none"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{part.text}</p>
              </div>
            );
          }

          // Handle tool parts using type-safe pattern
          if (isToolUIPart(part)) {
            const { toolName, toolCallId, state } = part;

            // Loading state
            if (state === 'input-streaming' || state === 'input-available') {
              return (
                <div
                  key={`${message.id}-tool-${toolCallId}`}
                  className="bg-white/5 rounded-2xl px-4 py-3 border border-white/5"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing {toolName}...</span>
                  </div>
                </div>
              );
            }

            // Output available - render tool result
            if (state === 'output-available') {
              // Tool output is wrapped in ToolResult<T>
              const output = part.output as any;

              // Handle error case
              if (output && output.success === false) {
                return (
                  <div
                    key={`${message.id}-tool-${toolCallId}`}
                    className="bg-red-500/10 rounded-2xl px-4 py-3 border border-red-500/20"
                  >
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>{output.error || 'Tool execution failed'}</span>
                    </div>
                  </div>
                );
              }

              // Handle success case - use ToolResultCard for rendering
              if (output && output.success === true) {
                return (
                  <ToolResultCard
                    key={`${message.id}-tool-${toolCallId}`}
                    toolName={toolName}
                    input={part.input}
                    output={output.data}
                    message={output.message}
                    onApplyEdit={onApplyEdit}
                    onInsertDiagram={onInsertDiagram}
                  />
                );
              }

              // Fallback for legacy/unstructured output
              return (
                <ToolResultCard
                  key={`${message.id}-tool-${toolCallId}`}
                  toolName={toolName}
                  input={part.input}
                  output={output}
                  onApplyEdit={onApplyEdit}
                  onInsertDiagram={onInsertDiagram}
                />
              );
            }
          }

          // Unknown part type
          return null;
        })}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </motion.div>
  );
}
```

---

## ✅ Definition of Done

- [ ] `AcademicUIMessage` type used for message prop
- [ ] `isToolUIPart` used for type-safe tool part detection
- [ ] Tool states handled (`input-streaming`, `input-available`, `output-available`)
- [ ] `ToolSuccess`/`ToolError` structure handled
- [ ] `ToolResultCard` used for rendering tool results
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/features/builder/components/v2/AcademicMessageBubble.tsx` | Updated component |

---

## 🚫 Constraints

- Preserve existing styling patterns
- Keep animation behavior
- Handle all tool types gracefully

---

*Generated by vibe-orchestrator mode*
