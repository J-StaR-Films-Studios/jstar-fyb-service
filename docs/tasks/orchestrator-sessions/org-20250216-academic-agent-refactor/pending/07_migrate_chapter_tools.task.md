# Task: Migrate Chapter Tools

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P1  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the chapter management tools from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/chapter-tools.ts`. This includes:
- `listChapters`
- `loadChapter`
- `addChapter`
- `generateChapterOutline`

---

## 🎯 Scope

**In Scope:**
- Create all four chapter tools in one file
- Use `inputSchema` (not deprecated `parameters`)
- Return clean data structures (remove `[SYSTEM: ...]` and `[INSTRUCTION: ...]` tags)
- Export `UIToolInvocation` types for each tool
- Preserve exact functionality

**Out of Scope:**
- Modifying the original file (yet)
- Frontend changes
- Agent integration

---

## 📚 Context

### Original Implementations

#### listChapters (lines 159-171)
```typescript
listChapters: tool({
    description: `List all chapters in the current project to see their status and titles.`,
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const chapters = await ChapterService.getChapters(projectId);
            if (chapters.length === 0) return "No chapters found. You can start by generating an outline.";
            return `[SYSTEM: execution complete] Here is the list of chapters:\n${JSON.stringify(chapters, null, 2)}\n\n[INSTRUCTION: Present this list to the user in a readable format and ask if they would like to load or edit any specific chapter.]`;
        } catch (error: any) {
            return `Failed to list chapters: ${error.message}`;
        }
    }
}),
```

#### loadChapter (lines 173-192)
```typescript
loadChapter: tool({
    description: `Load the full content of a specific chapter into the context for reading or editing.`,
    inputSchema: z.object({
        chapterNumber: z.number()
    }),
    execute: async ({ chapterNumber }) => {
        try {
            const chapter = await ChapterService.getChapter(projectId, chapterNumber);
            if (!chapter) return `Chapter ${chapterNumber} does not exist.`;

            const preview = chapter.content ? chapter.content.slice(0, 500) + "..." : "(Empty)";
            return `[SYSTEM: execution complete] Loaded Chapter ${chapterNumber}: ${chapter.title}\nStatus: ${chapter.status}\n\nPreview:\n${preview}\n\n[INSTRUCTION: Confirm to the user that the chapter is loaded and ready for editing. Ask what they would like to change.]`;
        } catch (error: any) {
            return `Failed to load chapter: ${error.message}`;
        }
    }
}),
```

#### addChapter (lines 194-209)
```typescript
addChapter: tool({
    description: `Create a new chapter in the project.`,
    inputSchema: z.object({
        number: z.number(),
        title: z.string(),
        initialContent: z.string().optional()
    }),
    execute: async ({ number, title, initialContent }) => {
        try {
            await ChapterService.createChapter(projectId, { number, title, content: initialContent });
            return `[SYSTEM: execution complete] Chapter ${number}: "${title}" created successfully.\n\n[INSTRUCTION: Confirm the creation to the user.]`;
        } catch (error: any) {
            return `Failed to create chapter: ${error.message}`;
        }
    }
}),
```

#### generateChapterOutline (lines 211-227)
```typescript
generateChapterOutline: tool({
    description: `Generate a suggested structure of chapters for the project based on the topic.`,
    inputSchema: z.object({
        focus: z.string().optional().describe('Specific focus area or methodology to emphasize')
    }),
    execute: async ({ focus }) => {
        try {
            const outline = await ChapterService.generateOutline(projectId, {
                topic: '', // Service will fetch from DB
                focus
            });
            return `[SYSTEM: execution complete] Generated Outline:\n${JSON.stringify(outline, null, 2)}\n\n[INSTRUCTION: Present this outline. IF the user's original request was to "generate the full chapter" or "do it all", PROCEED IMMEDIATELY to calling 'generateSection' for each item in the outline. Do not stop to ask. Otherwise, ask for approval.]`;
        } catch (error: any) {
            return `Failed to generate outline: ${error.message}`;
        }
    }
}),
```

### Dependencies
- `ChapterService` from `@/features/builder/services/chapterService`
- `projectId` from context

### Issues to Fix
1. ❌ All tools return strings with embedded `[SYSTEM: ...]` and `[INSTRUCTION: ...]` tags
2. ❌ Error handling returns strings instead of structured errors
3. ❌ No type exports for frontend

---

## 🔧 New Implementation

```typescript
// src/lib/tools/chapter-tools.ts
import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ChapterService } from '@/features/builder/services/chapterService';
import { ToolResult, toolSuccess, toolError } from './types';
import type { ToolExecutionContext } from './types';

// ============================================================
// LIST CHAPTERS TOOL
// ============================================================

const listChaptersSchema = z.object({});

interface ChapterSummary {
  number: number;
  title: string;
  status: string;
}

interface ListChaptersOutput {
  chapters: ChapterSummary[];
  hasChapters: boolean;
}

export const listChaptersTool = tool({
  description: 'List all chapters in the current project to see their status and titles.',
  
  inputSchema: listChaptersSchema,
  
  execute: async (_, context): Promise<ToolResult<ListChaptersOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
    try {
      const chapters = await ChapterService.getChapters(projectId);
      
      const chapterSummaries: ChapterSummary[] = chapters.map(c => ({
        number: c.number,
        title: c.title,
        status: c.status,
      }));
      
      return toolSuccess<ListChaptersOutput>({
        chapters: chapterSummaries,
        hasChapters: chapters.length > 0,
      });
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return toolError(`Failed to list chapters: ${message}`, { error });
    }
  },
});

export type ListChaptersInvocation = UIToolInvocation<typeof listChaptersTool>;

// ============================================================
// LOAD CHAPTER TOOL
// ============================================================

const loadChapterSchema = z.object({
  chapterNumber: z.number()
    .describe('The chapter number to load'),
});

interface LoadChapterOutput {
  chapterNumber: number;
  title: string;
  status: string;
  content: string;
  contentPreview: string;
  wordCount: number;
}

export const loadChapterTool = tool({
  description: 'Load the full content of a specific chapter into the context for reading or editing.',
  
  inputSchema: loadChapterSchema,
  
  execute: async ({ chapterNumber }, context): Promise<ToolResult<LoadChapterOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
    try {
      const chapter = await ChapterService.getChapter(projectId, chapterNumber);
      
      if (!chapter) {
        return toolError(`Chapter ${chapterNumber} does not exist.`);
      }
      
      const content = chapter.content || '';
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      
      return toolSuccess<LoadChapterOutput>({
        chapterNumber: chapter.number,
        title: chapter.title,
        status: chapter.status,
        content,
        contentPreview: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
        wordCount,
      });
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return toolError(`Failed to load chapter: ${message}`, { error });
    }
  },
});

export type LoadChapterInvocation = UIToolInvocation<typeof loadChapterTool>;

// ============================================================
// ADD CHAPTER TOOL
// ============================================================

const addChapterSchema = z.object({
  number: z.number()
    .describe('The chapter number'),
  
  title: z.string()
    .describe('The title for the new chapter'),
  
  initialContent: z.string()
    .optional()
    .describe('Optional initial content for the chapter'),
});

interface AddChapterOutput {
  number: number;
  title: string;
  created: boolean;
}

export const addChapterTool = tool({
  description: 'Create a new chapter in the project.',
  
  inputSchema: addChapterSchema,
  
  execute: async ({ number, title, initialContent }, context): Promise<ToolResult<AddChapterOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
    try {
      await ChapterService.createChapter(projectId, {
        number,
        title,
        content: initialContent,
      });
      
      return toolSuccess<AddChapterOutput>({
        number,
        title,
        created: true,
      }, `Chapter ${number}: "${title}" created successfully.`);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return toolError(`Failed to create chapter: ${message}`, { error });
    }
  },
});

export type AddChapterInvocation = UIToolInvocation<typeof addChapterTool>;

// ============================================================
// GENERATE CHAPTER OUTLINE TOOL
// ============================================================

const generateChapterOutlineSchema = z.object({
  focus: z.string()
    .optional()
    .describe('Specific focus area or methodology to emphasize in the outline'),
});

interface OutlineItem {
  number: number;
  title: string;
  description?: string;
}

interface GenerateChapterOutlineOutput {
  outline: OutlineItem[];
  focus?: string;
}

export const generateChapterOutlineTool = tool({
  description: 'Generate a suggested structure of chapters for the project based on the topic. Returns a list of chapters with numbers and titles.',
  
  inputSchema: generateChapterOutlineSchema,
  
  execute: async ({ focus }, context): Promise<ToolResult<GenerateChapterOutlineOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
    try {
      // Service fetches topic from DB
      const outline = await ChapterService.generateOutline(projectId, {
        topic: '',
        focus,
      });
      
      return toolSuccess<GenerateChapterOutlineOutput>({
        outline: Array.isArray(outline) ? outline : [],
        focus,
      });
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return toolError(`Failed to generate outline: ${message}`, { error });
    }
  },
});

export type GenerateChapterOutlineInvocation = UIToolInvocation<typeof generateChapterOutlineTool>;

// ============================================================
// TOOL METADATA
// ============================================================

export const chapterToolsMeta = {
  listChapters: {
    name: 'listChapters',
    description: 'List all chapters in the project',
    category: 'chapter' as const,
    requiresContext: true,
  },
  loadChapter: {
    name: 'loadChapter',
    description: 'Load a specific chapter',
    category: 'chapter' as const,
    requiresContext: true,
  },
  addChapter: {
    name: 'addChapter',
    description: 'Create a new chapter',
    category: 'chapter' as const,
    requiresContext: true,
    mutations: true,
  },
  generateChapterOutline: {
    name: 'generateChapterOutline',
    description: 'Generate chapter structure for project',
    category: 'chapter' as const,
    requiresContext: true,
    mutations: true,
  },
};
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/chapter-tools.ts` created
- [ ] All four tools implemented
- [ ] All tools use `inputSchema` (not `parameters`)
- [ ] All tools return clean `ToolResult` types
- [ ] All `[SYSTEM: ...]` and `[INSTRUCTION: ...]` tags removed
- [ ] All `UIToolInvocation` types exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors
- [ ] ChapterService imports correct

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/chapter-tools.ts` | All four chapter tools |

---

## 🚫 Constraints

- Preserve exact ChapterService calls
- Keep error logging (console.log can be removed, console.error kept)
- Handle edge cases (empty chapters, non-existent chapters)

---

## 📝 Important Notes

### Behavior Change: Embedded Instructions

The original tools had instructions embedded like:
```
[INSTRUCTION: Present this list to the user in a readable format and ask if they would like to load or edit any specific chapter.]
```

These are removed. The agent's system prompt should guide behavior instead. This makes the tools more reusable and the behavior more consistent.

### Behavior Change: generateChapterOutline

The original had:
```
[INSTRUCTION: ... IF the user's original request was to "generate the full chapter" or "do it all", PROCEED IMMEDIATELY to calling 'generateSection' for each item in the outline. Do not stop to ask.]
```

This autonomous behavior should be handled by:
1. The system prompt instructing the agent on autonomous behavior
2. The `stopWhen` condition allowing multiple steps
3. The agent's reasoning capability

---

*Generated by vibe-orchestrator mode*
