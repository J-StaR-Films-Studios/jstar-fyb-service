# Task: Migrate Context Tools (saveUserContext, getChapterGuidelines)

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P1  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the context-related tools (`saveUserContext` and `getChapterGuidelines`) from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/save-context.ts`.

---

## 🎯 Scope

**In Scope:**
- Create `saveUserContext` tool
- Create `getChapterGuidelines` tool
- Use `inputSchema` (not deprecated `parameters`)
- Return clean data structures
- Export `UIToolInvocation` types for frontend
- Preserve exact functionality

**Out of Scope:**
- Modifying the original file (yet)
- Frontend changes
- Agent integration

---

## 📚 Context

### Original Implementations (academicTools.ts)

#### saveUserContext (lines 130-144)
```typescript
saveUserContext: tool({
    description: `Save user details like department, course, or institution.`,
    inputSchema: z.object({
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
}),
```

#### getChapterGuidelines (lines 146-155)
```typescript
getChapterGuidelines: tool({
    description: `Get the specific writing rules, structure, and constraints for a given chapter number. Use this if you need to know what sections are required or what is forbidden in a specific chapter.`,
    inputSchema: z.object({
        chapterNumber: z.number()
    }),
    execute: async ({ chapterNumber }) => {
        const rules = getChapterSpecificPrompt(chapterNumber, '');
        return `[SYSTEM: execution complete] Here are the rules for Chapter ${chapterNumber}:\n${rules}\n\n[INSTRUCTION: Use these rules to guide your advice or content generation.]`;
    }
}),
```

### Dependencies
- `prisma` from `@/lib/prisma`
- `getChapterSpecificPrompt` from `@/features/bot/prompts/chapterPrompts`
- `projectId` from context

### Issues to Fix
1. ❌ `getChapterGuidelines` returns string with embedded tags
2. ❌ No type exports for frontend
3. ❌ No structured error handling

---

## 🔧 New Implementation

```typescript
// src/lib/tools/save-context.ts
/**
 * Context Tools
 * 
 * Tools for saving user context and retrieving chapter guidelines.
 * 
 * @module lib/tools/save-context
 */

import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getChapterSpecificPrompt } from '@/features/bot/prompts/chapterPrompts';
import { ToolResult, toolSuccess, toolError } from './types';
import type { ToolExecutionContext } from './types';

// ============================================================
// SAVE USER CONTEXT TOOL
// ============================================================

const saveUserContextSchema = z.object({
  department: z.string()
    .optional()
    .describe('The user\'s department (e.g., "Computer Science")'),
  
  course: z.string()
    .optional()
    .describe('The user\'s course or program (e.g., "Bachelor of Science")'),
  
  institution: z.string()
    .optional()
    .describe('The user\'s institution or university'),
});

interface SaveUserContextOutput {
  department?: string;
  course?: string;
  institution?: string;
  contextComplete: boolean;
}

/**
 * Save user details like department, course, or institution.
 * These details are used to personalize the academic writing.
 */
export const saveUserContextTool = tool({
  description: 'Save user details like department, course, or institution. These are used to personalize the academic writing style and content.',
  
  inputSchema: saveUserContextSchema,
  
  execute: async (data, context): Promise<ToolResult<SaveUserContextOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
    try {
      // Only save non-empty values
      const updateData: Record<string, string | boolean> = {};
      
      if (data.department) updateData.department = data.department;
      if (data.course) updateData.course = data.course;
      if (data.institution) updateData.institution = data.institution;
      
      // Mark context as complete if any data provided
      if (Object.keys(updateData).length > 0) {
        updateData.contextComplete = true;
      }
      
      await prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });
      
      return toolSuccess<SaveUserContextOutput>({
        department: data.department,
        course: data.course,
        institution: data.institution,
        contextComplete: Object.keys(updateData).length > 0,
      }, 'User context saved successfully.');
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[saveUserContext] Error:', error);
      return toolError(`Failed to save context: ${message}`, { error });
    }
  },
});

export type SaveUserContextInvocation = UIToolInvocation<typeof saveUserContextTool>;

// ============================================================
// GET CHAPTER GUIDELINES TOOL
// ============================================================

const getChapterGuidelinesSchema = z.object({
  chapterNumber: z.number()
    .describe('The chapter number to get guidelines for (e.g., 1, 2, 3)'),
});

interface GetChapterGuidelinesOutput {
  chapterNumber: number;
  guidelines: string;
}

/**
 * Get the specific writing rules, structure, and constraints for a given chapter.
 * Use this to understand what sections are required or what is forbidden.
 */
export const getChapterGuidelinesTool = tool({
  description: 'Get the specific writing rules, structure, and constraints for a given chapter number. Use this if you need to know what sections are required or what is forbidden in a specific chapter before generating content.',
  
  inputSchema: getChapterGuidelinesSchema,
  
  execute: async ({ chapterNumber }): Promise<ToolResult<GetChapterGuidelinesOutput>> => {
    try {
      const guidelines = getChapterSpecificPrompt(chapterNumber, '');
      
      return toolSuccess<GetChapterGuidelinesOutput>({
        chapterNumber,
        guidelines,
      });
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[getChapterGuidelines] Error:', error);
      return toolError(`Failed to get guidelines: ${message}`, { error });
    }
  },
});

export type GetChapterGuidelinesInvocation = UIToolInvocation<typeof getChapterGuidelinesTool>;

// ============================================================
// TOOL METADATA
// ============================================================

export const contextToolsMeta = {
  saveUserContext: {
    name: 'saveUserContext',
    description: 'Save user context details',
    category: 'context' as const,
    requiresContext: true,
    mutations: true,
  },
  getChapterGuidelines: {
    name: 'getChapterGuidelines',
    description: 'Get chapter-specific writing guidelines',
    category: 'context' as const,
    requiresContext: false,
    mutations: false,
  },
};
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/save-context.ts` created
- [ ] Both tools use `inputSchema` (not `parameters`)
- [ ] Both tools return clean `ToolResult` types
- [ ] No embedded `[INSTRUCTION: ...]` tags
- [ ] `SaveUserContextInvocation` type exported
- [ ] `GetChapterGuidelinesInvocation` type exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/save-context.ts` | Migrated context tools |

---

## 🚫 Constraints

- Preserve exact database update behavior
- Keep the chapter prompt retrieval logic
- Handle optional fields correctly

---

*Generated by vibe-orchestrator mode*
