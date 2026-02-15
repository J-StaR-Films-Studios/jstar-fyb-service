# Task: Migrate generateSection Tool

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P0 (Critical)  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the `generateSection` tool from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/generate-section.ts`. This is the most complex tool with a mutex lock for sequential execution and nested AI generation.

---

## 🎯 Scope

**In Scope:**
- Create new tool definition using AI SDK v6 patterns
- Preserve the mutex lock mechanism for sequential execution
- Handle both "Direct Mode" (provided content) and "Agentic Mode" (AI-generated content)
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

### Original Implementation (academicTools.ts lines 229-334)

```typescript
// Simple Mutex for Sequential Execution
class SimpleMutex {
    private promise = Promise.resolve();

    lock(): Promise<() => void> {
        let unlock: () => void;
        const next = new Promise<void>(resolve => unlock = resolve);
        const willLock = this.promise.then(() => unlock);
        this.promise = this.promise.then(() => next);
        return willLock;
    }
}

const sectionMutex = new SimpleMutex();

// ... in createAcademicTools function:

generateSection: tool({
    description: `Generate or expand a specific section of text. Can be used in "Direct Mode" (saving your text) or "Agentic Mode" (generating text from instructions).`,
    inputSchema: z.object({
        chapterNumber: z.number(),
        sectionTitle: z.string(),
        content: z.string().optional().describe('Direct text content to save (Direct Mode)'),
        instructions: z.string().optional().describe('Instructions for AI to generate content (Agentic Mode)'),
        context: z.string().optional().describe('Additional context for generation')
    }),
    execute: async ({ chapterNumber, sectionTitle, content, instructions, context }) => {
        // ACQUIRE LOCK (The "Queue")
        const unlock = await sectionMutex.lock();

        try {
            // Hybrid Logic
            let finalContent = content;

            if (!finalContent && instructions) {
                // 1. Fetch Full Context (The "Brain Upgrade")
                const [existingChapter, allChapters] = await Promise.all([
                    ChapterService.getChapter(projectId, chapterNumber),
                    ChapterService.getChapters(projectId)
                ]);

                const existingContent = existingChapter?.content || "";
                const outlineContext = allChapters.map(c => `Chapter ${c.number}: ${c.title}`).join('\n');

                // Agentic Mode: Generate content on the fly
                console.log(`[Tool:Queue] Running generation for "${sectionTitle}"...`);
                const { model } = selectModel({ quality: 'high' });
                const result = await generateText({
                    model,
                    prompt: `
                    You are an expert academic writer.
                    Write a section titled "${sectionTitle}" for Chapter ${chapterNumber}.
                    
                    Instructions: ${instructions}
                    Context: ${context || 'None provided'}

                    ## FULL CHAPTER CONTEXT (So Far)
                    Below is the content written in this chapter. You must ensure your new section flows coherently with this text.
                    If the chapter is empty, start fresh. if text exists, transition smoothly.
                    
                    '''
                    ${existingContent}
                    '''

                    ## PROJECT STRUCTURE
                    ${outlineContext}

                    ## COMMON ACADEMIC GUIDELINES
                    ${COMMON_ACADEMIC_RULES}

                    ## SPECIFIC CHAPTER INSTRUCTIONS
                    ${getChapterSpecificPrompt(chapterNumber, '')}

                    ## UNIVERSAL ACADEMIC GUIDELINES (Deprecated placeholder, ensuring transition)
                    Keep it academic and professional.
                    `
                });
                finalContent = result.text;
            }

            if (!finalContent) {
                return "Error: Please provide either 'content' (direct) or 'instructions' (for generation).";
            }

            // CRITICAL: Actually save to the database!
            let chapter = await ChapterService.getChapter(projectId, chapterNumber);
            if (!chapter) {
                chapter = await ChapterService.createChapter(projectId, {
                    number: chapterNumber,
                    title: `Chapter ${chapterNumber}`,
                    content: ''
                });
            }

            const newContent = chapter.content
                ? `${chapter.content}\n\n${finalContent}`
                : finalContent;

            await ChapterService.updateChapterContent(projectId, chapterNumber, newContent);

            return {
                tool: 'generateSection',
                status: 'success',
                chapterNumber,
                sectionTitle,
                generatedContent: finalContent,
                message: `Section "${sectionTitle}" generated AND SAVED to Chapter ${chapterNumber}. (Queue: Released)`
            };

        } catch (error: any) {
            return `Failed to generate section: ${error.message}`;
        } finally {
            unlock();
        }
    }
})
```

### Dependencies
- `ChapterService` from `@/features/builder/services/chapterService`
- `selectModel` from `@/lib/ai/router`
- `generateText` from `ai`
- `COMMON_ACADEMIC_RULES` and `getChapterSpecificPrompt` from chapter prompts
- `projectId` from context

### Critical Features to Preserve
1. **Mutex Lock**: Ensures sequential execution of section generation
2. **Dual Mode**: Direct (content provided) vs Agentic (AI generates)
3. **Context Fetching**: Gets existing chapter content for coherence
4. **Database Save**: Actually persists to the database
5. **Chapter Creation**: Creates phantom chapter if missing

---

## 🔧 New Implementation

```typescript
// src/lib/tools/generate-section.ts
import { tool, UIToolInvocation, generateText } from 'ai';
import { z } from 'zod';
import { ChapterService } from '@/features/builder/services/chapterService';
import { selectModel } from '@/lib/ai/router';
import { COMMON_ACADEMIC_RULES, getChapterSpecificPrompt } from '@/features/bot/prompts/chapterPrompts';
import { ToolResult, toolSuccess, toolError } from './types';
import type { ToolExecutionContext } from './types';

// ============================================================
// MUTEX FOR SEQUENTIAL EXECUTION
// ============================================================

/**
 * Simple mutex to ensure sequential execution of section generation.
 * This prevents race conditions when multiple sections are being
 * generated for the same chapter.
 */
class SimpleMutex {
  private promise = Promise.resolve();

  lock(): Promise<() => void> {
    let unlock: () => void;
    const next = new Promise<void>(resolve => { unlock = resolve; });
    const willLock = this.promise.then(() => unlock!);
    this.promise = this.promise.then(() => next);
    return willLock;
  }
}

// Global mutex instance for section generation
const sectionMutex = new SimpleMutex();

// ============================================================
// INPUT SCHEMA
// ============================================================

const generateSectionSchema = z.object({
  chapterNumber: z.number()
    .describe('The chapter number to add the section to'),
  
  sectionTitle: z.string()
    .describe('The title of the section to generate or save'),
  
  content: z.string()
    .optional()
    .describe('Direct text content to save (Direct Mode) - provide this OR instructions'),
  
  instructions: z.string()
    .optional()
    .describe('Instructions for AI to generate content (Agentic Mode) - provide this OR content'),
  
  context: z.string()
    .optional()
    .describe('Additional context for generation (e.g., research findings, user notes)'),
});

// ============================================================
// OUTPUT TYPES
// ============================================================

interface GenerateSectionOutput {
  chapterNumber: number;
  sectionTitle: string;
  generatedContent: string;
  isNewChapter: boolean;
  totalWordCount: number;
}

// ============================================================
// TOOL DEFINITION
// ============================================================

/**
 * Generate or expand a specific section of text.
 * 
 * Supports two modes:
 * - **Direct Mode**: Provide `content` to save directly
 * - **Agentic Mode**: Provide `instructions` to have AI generate content
 * 
 * The tool will:
 * 1. Acquire a mutex lock (ensures sequential processing)
 * 2. If in Agentic Mode, generate content using AI with full context
 * 3. Create the chapter if it doesn't exist
 * 4. Append the content to the chapter
 * 5. Save to database
 * 6. Release the mutex lock
 */
export const generateSectionTool = tool({
  description: `Generate or expand a specific section of text for a chapter. 
    
Use "Direct Mode" (provide content) when you have text ready to save.
Use "Agentic Mode" (provide instructions) when you want AI to generate content.

The section will be appended to the chapter and saved to the database automatically.`,
  
  inputSchema: generateSectionSchema,
  
  execute: async ({ 
    chapterNumber, 
    sectionTitle, 
    content, 
    instructions, 
    context: additionalContext 
  }, executionContext): Promise<ToolResult<GenerateSectionOutput>> => {
    const { projectId } = executionContext as ToolExecutionContext;
    
    // ACQUIRE LOCK - Ensures sequential execution
    const unlock = await sectionMutex.lock();
    
    try {
      console.log(`[generateSection] Processing "${sectionTitle}" for Chapter ${chapterNumber}`);
      
      // Validate input - must have either content or instructions
      if (!content && !instructions) {
        return toolError("Please provide either 'content' (Direct Mode) or 'instructions' (Agentic Mode).");
      }
      
      let finalContent = content;
      
      // AGENTIC MODE: Generate content using AI
      if (!finalContent && instructions) {
        console.log(`[generateSection] Running Agentic Mode for "${sectionTitle}"...`);
        
        // Fetch full context for coherent generation
        const [existingChapter, allChapters] = await Promise.all([
          ChapterService.getChapter(projectId, chapterNumber),
          ChapterService.getChapters(projectId),
        ]);
        
        const existingContent = existingChapter?.content || '';
        const outlineContext = allChapters
          .map(c => `Chapter ${c.number}: ${c.title}`)
          .join('\n');
        
        // Select appropriate model for generation
        const { model } = selectModel({ quality: 'high' });
        
        // Generate the section content
        const result = await generateText({
          model,
          prompt: `You are an expert academic writer.
Write a section titled "${sectionTitle}" for Chapter ${chapterNumber}.

## Instructions
${instructions}

## Additional Context
${additionalContext || 'None provided'}

## FULL CHAPTER CONTEXT (So Far)
Below is the content already written in this chapter. Your new section must flow coherently with this text.
If the chapter is empty, start fresh. If text exists, transition smoothly.

---
${existingContent}
---

## PROJECT STRUCTURE
${outlineContext}

## COMMON ACADEMIC GUIDELINES
${COMMON_ACADEMIC_RULES}

## SPECIFIC CHAPTER INSTRUCTIONS
${getChapterSpecificPrompt(chapterNumber, '')}
`,
        });
        
        finalContent = result.text;
        console.log(`[generateSection] Generated ${finalContent?.split(/\s+/).length || 0} words`);
      }
      
      if (!finalContent) {
        return toolError('Failed to generate content. Please try again.');
      }
      
      // ENSURE CHAPTER EXISTS
      let chapter = await ChapterService.getChapter(projectId, chapterNumber);
      let isNewChapter = false;
      
      if (!chapter) {
        // Create phantom chapter if missing
        console.log(`[generateSection] Creating new chapter ${chapterNumber}`);
        chapter = await ChapterService.createChapter(projectId, {
          number: chapterNumber,
          title: `Chapter ${chapterNumber}`,
          content: '',
        });
        isNewChapter = true;
      }
      
      // APPEND CONTENT TO CHAPTER
      const newContent = chapter.content
        ? `${chapter.content}\n\n${finalContent}`
        : finalContent;
      
      // SAVE TO DATABASE
      await ChapterService.updateChapterContent(projectId, chapterNumber, newContent);
      
      // Calculate word count
      const totalWordCount = newContent.split(/\s+/).filter(Boolean).length;
      
      console.log(`[generateSection] Saved "${sectionTitle}" to Chapter ${chapterNumber}. Total words: ${totalWordCount}`);
      
      return toolSuccess<GenerateSectionOutput>({
        chapterNumber,
        sectionTitle,
        generatedContent: finalContent,
        isNewChapter,
        totalWordCount,
      }, `Section "${sectionTitle}" saved to Chapter ${chapterNumber}.`);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[generateSection] Error:', error);
      return toolError(`Failed to generate section: ${message}`, { error });
      
    } finally {
      // RELEASE LOCK - Always release, even on error
      unlock();
    }
  },
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type GenerateSectionInvocation = UIToolInvocation<typeof generateSectionTool>;

// ============================================================
// TOOL METADATA
// ============================================================

export const generateSectionMeta = {
  name: 'generateSection',
  description: 'Generate or save content for chapter sections',
  category: 'content' as const,
  requiresContext: true,
  mutations: true, // This tool modifies the database
};
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/generate-section.ts` created
- [ ] Mutex lock preserved and working
- [ ] Tool uses `inputSchema` (not `parameters`)
- [ ] Returns clean `ToolResult<GenerateSectionOutput>` type
- [ ] Both Direct Mode and Agentic Mode work
- [ ] Context fetching preserved (existing chapter, all chapters)
- [ ] Database save preserved
- [ ] Phantom chapter creation preserved
- [ ] `GenerateSectionInvocation` type exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/generate-section.ts` | Migrated tool with mutex |

---

## 🚫 Constraints

- **MUST** preserve the mutex lock - critical for data integrity
- **MUST** preserve database persistence
- Keep the same prompt structure for AI generation
- Handle all error cases properly

---

## 🧪 Testing Considerations

After integration, test:
1. **Sequential calls**: Multiple section generations in quick succession
2. **Agentic Mode**: AI generation with instructions only
3. **Direct Mode**: Save content directly
4. **New Chapter**: Generate section for non-existent chapter
5. **Error Recovery**: What happens if generation fails mid-way?

---

*Generated by vibe-orchestrator mode*
