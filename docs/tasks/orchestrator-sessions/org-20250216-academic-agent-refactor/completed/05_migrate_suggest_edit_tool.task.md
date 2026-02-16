# Task: Migrate suggestEdit Tool

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P1  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the `suggestEdit` tool from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/suggest-edit.ts`.

---

## 🎯 Scope

**In Scope:**
- Create new tool definition using AI SDK v6 patterns
- Use `inputSchema` (not deprecated `parameters`)
- Return clean data structures
- Export `UIToolInvocation` type for frontend
- Preserve exact functionality

**Out of Scope:**
- Modifying the original file (yet)
- Frontend changes
- Agent integration

---

## 📚 Context

### Original Implementation (academicTools.ts lines 64-82)

```typescript
suggestEdit: tool({
    description: `Suggest a specific content revision for a chapter or section. Use this when the user asks to "rewrite", "improve", "fix", or "change" specific text.`,
    inputSchema: z.object({
        chapterNumber: z.number().describe('The chapter number to edit'),
        currentContentToReplace: z.string().describe('The EXACT text snippet to be replaced (must match existing text)'),
        newContent: z.string().describe('The proposed new content'),
        explanation: z.string().describe('Brief reason for the change'),
    }),
    execute: async ({ chapterNumber, currentContentToReplace, newContent, explanation }: { chapterNumber: number; currentContentToReplace: string; newContent: string; explanation: string }) => {
        console.log(`[Chat API] Tool Executed: suggestEdit`, { chapterNumber, explanation });
        return {
            tool: 'suggestEdit',
            chapterNumber,
            original: currentContentToReplace,
            replacement: newContent,
            explanation
        };
    }
}),
```

### Dependencies
- None (pure data return)
- Logging

### Notes
- This tool already returns a clean object! Good pattern.
- Used by `EditSuggestionCard` in frontend

---

## 🔧 New Implementation

```typescript
// src/lib/tools/suggest-edit.ts
import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ToolResult, toolSuccess } from './types';

/**
 * Input schema for suggestEdit tool
 */
const suggestEditSchema = z.object({
  chapterNumber: z.number()
    .describe('The chapter number to edit'),
  
  currentContentToReplace: z.string()
    .describe('The EXACT text snippet to be replaced (must match existing text exactly)'),
  
  newContent: z.string()
    .describe('The proposed new content to replace the current content'),
  
  explanation: z.string()
    .describe('Brief explanation of why this change is being suggested'),
});

/**
 * Output type for suggestEdit
 */
interface SuggestEditOutput {
  chapterNumber: number;
  original: string;
  replacement: string;
  explanation: string;
}

/**
 * Suggest a specific content revision for a chapter or section.
 * Use this when the user asks to "rewrite", "improve", "fix", or "change" specific text.
 * 
 * The suggestion will be presented to the user for approval before being applied.
 */
export const suggestEditTool = tool({
  description: 'Suggest a specific content revision for a chapter or section. Use this when the user asks to "rewrite", "improve", "fix", or "change" specific text. The user will review and approve before changes are applied.',
  
  inputSchema: suggestEditSchema,
  
  execute: async ({ chapterNumber, currentContentToReplace, newContent, explanation }): Promise<ToolResult<SuggestEditOutput>> => {
    console.log('[suggestEdit] Tool executed:', { chapterNumber, explanation });
    
    return toolSuccess<SuggestEditOutput>({
      chapterNumber,
      original: currentContentToReplace,
      replacement: newContent,
      explanation,
    });
  },
});

/**
 * Type for frontend component rendering
 */
export type SuggestEditInvocation = UIToolInvocation<typeof suggestEditTool>;

/**
 * Tool metadata for documentation
 */
export const suggestEditMeta = {
  name: 'suggestEdit',
  description: 'Suggest content revisions for chapters',
  category: 'content' as const,
  requiresContext: false,
  mutations: false, // Suggestion only - user must approve
};
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/suggest-edit.ts` created
- [ ] Tool uses `inputSchema` (not `parameters`)
- [ ] Returns clean `ToolResult<SuggestEditOutput>` type
- [ ] `SuggestEditInvocation` type exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors
- [ ] Output structure matches original (for frontend compatibility)

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/suggest-edit.ts` | Migrated tool |

---

## 🚫 Constraints

- Preserve exact output structure (frontend depends on it)
- Keep logging
- Don't change the description significantly (affects model behavior)

---

## 📝 Frontend Compatibility

The frontend `EditSuggestionCard` expects:
```typescript
{
  chapterNumber: number;
  original: string;
  replacement: string;
  explanation: string;
}
```

This is wrapped in `ToolSuccess`, so the frontend will access:
```typescript
part.output.data.chapterNumber
part.output.data.original
// etc.
```

The frontend will need updates to handle the new structure.

---

*Generated by vibe-orchestrator mode*
