# Master Plan: Academic Agent Refactor (Path B - ToolLoopAgent)

**Session ID:** org-20250216-academic-agent-refactor  
**Created:** 2026-02-16  
**Status:** In Progress  
**Approach:** Path B - Full ToolLoopAgent Modernization

---

## Overview

Refactor the Monji Academic Copilot chat system from the deprecated `maxSteps` pattern with raw `streamText` to the modern AI SDK v6 `ToolLoopAgent` pattern. This will provide end-to-end type safety, cleaner code organization, and proper agentic loop handling for both thinking and non-thinking models.

## Goals

1. ✅ Replace deprecated `maxSteps` with `stopWhen: stepCountIs(n)`
2. ✅ Create centralized `ToolLoopAgent` definition
3. ✅ Migrate tools to clean, type-safe definitions
4. ✅ Enable end-to-end type safety with `InferAgentUIMessage`
5. ✅ Support both thinking and non-thinking models
6. ✅ Clean up tool return patterns (remove embedded instructions)
7. ✅ Update frontend for typed message rendering

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEW ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   lib/agents/                                                            │
│   ├── academic-agent.ts      # ToolLoopAgent definition + type export   │
│   └── index.ts               # Re-exports                                │
│                                                                          │
│   lib/tools/                                                             │
│   ├── search-documents.ts    # Individual tool definitions              │
│   ├── generate-section.ts                                                │
│   ├── suggest-edit.ts                                                    │
│   ├── generate-diagram.ts                                                │
│   ├── chapter-tools.ts      # listChapters, loadChapter, addChapter     │
│   └── index.ts               # Tool registry                             │
│                                                                          │
│   app/api/projects/[id]/chat/                                           │
│   └── route.ts               # Uses createAgentUIStreamResponse         │
│                                                                          │
│   features/builder/components/v2/                                        │
│   ├── AcademicCopilot.tsx    # Typed useChat<AcademicUIMessage>         │
│   ├── AcademicMessageBubble.tsx  # Typed part rendering                 │
│   └── ToolResultCard.tsx     # Generic tool result display              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tasks

| # | Task File | Status | Assigned To | Dependencies |
|---|-----------|--------|-------------|--------------|
| 01 | 01_planning_inventory.task.md | Pending | vibe-architect | None |
| 02 | 02_create_directory_structure.task.md | Pending | vibe-code | 01 |
| 03 | 03_create_base_types.task.md | Pending | vibe-code | 02 |
| 04 | 04_migrate_search_documents_tool.task.md | Pending | vibe-code | 03 |
| 05 | 05_migrate_suggest_edit_tool.task.md | Pending | vibe-code | 03 |
| 06 | 06_migrate_generate_diagram_tool.task.md | Pending | vibe-code | 03 |
| 07 | 07_migrate_chapter_tools.task.md | Pending | vibe-code | 03 |
| 08 | 08_migrate_generate_section_tool.task.md | Pending | vibe-code | 03 |
| 08b | 08b_migrate_save_context_tools.task.md | Pending | vibe-code | 03 |
| 09 | 09_create_tool_registry.task.md | Pending | vibe-code | 04-08b |
| 10 | 10_create_academic_agent.task.md | Pending | vibe-code | 09 |
| 11 | 11_refactor_chat_api_route.task.md | Pending | vibe-code | 10 |
| 12 | 12_update_model_router.task.md | Pending | vibe-code | 10 |
| 13 | 13_update_academic_copilot.task.md | Pending | vibe-code | 11 |
| 14 | 14_update_message_bubble.task.md | Pending | vibe-code | 13 |
| 15 | 15_update_tool_result_cards.task.md | Pending | vibe-code | 13 |
| 16 | 16_cleanup_old_files.task.md | Pending | vibe-code | 15 |
| 17 | 17_typescript_verification.task.md | Pending | vibe-review | 16 |
| 18 | 18_integration_testing.task.md | Pending | vibe-review | 17 |

---

## Progress

- [ ] Phase 1: Planning & Inventory
- [ ] Phase 2: Foundation (Directory Structure + Types)
- [ ] Phase 3: Tool Migration *(tasks 04-08b can run parallel but recommend sequential)*
- [ ] Phase 4: Agent Creation
- [ ] Phase 5: API Route Refactor
- [ ] Phase 6: Frontend Updates
- [ ] Phase 7: Cleanup
- [ ] Phase 8: Verification & Testing

## Execution Mode

**Recommended: Sequential**
- One agent executes tasks in order
- Maintains full context between tasks
- Simpler debugging and type chain
- ~3-4 hours total for tool migrations

**Optional: Parallel (Tasks 04-08b only)**
- Tasks create separate files (no conflicts)
- Would need git worktrees for true isolation
- Adds merge complexity
- Only worth it if time-critical

---

## Key Files to Modify

### New Files (Create)
- `src/lib/agents/academic-agent.ts`
- `src/lib/agents/index.ts`
- `src/lib/tools/search-documents.ts`
- `src/lib/tools/suggest-edit.ts`
- `src/lib/tools/generate-diagram.ts`
- `src/lib/tools/generate-section.ts`
- `src/lib/tools/chapter-tools.ts`
- `src/lib/tools/save-context.ts`
- `src/lib/tools/types.ts`
- `src/lib/tools/index.ts`

### Modified Files
- `src/app/api/projects/[id]/chat/route.ts`
- `src/lib/ai/router.ts`
- `src/features/builder/components/v2/AcademicCopilot.tsx`
- `src/features/builder/components/v2/AcademicMessageBubble.tsx`
- `src/features/builder/components/v2/ToolResultCard.tsx`
- `src/features/builder/components/v2/EditSuggestionCard.tsx`
- `src/features/builder/components/v2/DiagramSuggestionCard.tsx`

### Deprecated Files (Remove after migration)
- `src/lib/ai/academicTools.ts` (replaced by `src/lib/tools/index.ts`)

---

## Critical Patterns to Follow

### 1. Tool Definition Pattern
```typescript
// lib/tools/example-tool.ts
import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';

export const exampleTool = tool({
  description: 'Clear description of what the tool does',
  inputSchema: z.object({
    param1: z.string().describe('Description of param'),
  }),
  execute: async ({ param1 }, context) => {
    // Clean return - NO embedded instructions
    return { result: 'data' };
  },
});

// Export type for UI components
export type ExampleToolInvocation = UIToolInvocation<typeof exampleTool>;
```

### 2. Agent Definition Pattern
```typescript
// lib/agents/academic-agent.ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

export const academicAgent = new ToolLoopAgent({
  model: ..., // Dynamic or static
  instructions: MONJI_SYSTEM_PROMPT,
  tools: { ... },
  stopWhen: stepCountIs(10),
});

export type AcademicUIMessage = InferAgentUIMessage<typeof academicAgent>;
```

### 3. API Route Pattern
```typescript
// app/api/projects/[id]/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';

return createAgentUIStreamResponse({
  agent: academicAgent,
  uiMessages: messages,
});
```

### 4. Frontend Pattern
```typescript
// components/AcademicCopilot.tsx
import type { AcademicUIMessage } from '@/lib/agents/academic-agent';

const { messages } = useChat<AcademicUIMessage>({
  transport: new DefaultChatTransport({ api: '/api/projects/.../chat' }),
});
```

---

## Notes

- **Thinking Models:** The ToolLoopAgent works identically with thinking and non-thinking models. The only difference is `providerOptions` for reasoning config.
- **Type Safety:** All tools must export their invocation types for UI components.
- **Backward Compatibility:** The message persistence format should remain compatible with existing threads.
- **Mutex Lock:** The `generateSection` tool has a mutex lock for sequential execution - this must be preserved.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing chat threads | Keep message format compatible |
| Tool execution order issues | Preserve mutex in generateSection |
| Type errors in frontend | Use InferAgentUIMessage strictly |
| Model routing confusion | Simplify router, remove redundancy |

---

*Generated by vibe-orchestrator mode*  
*Session Path: docs/tasks/orchestrator-sessions/org-20250216-academic-agent-refactor/*
