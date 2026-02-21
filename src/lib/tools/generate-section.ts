/**
 * Generate Section Tool
 * 
 * Tool for generating or expanding specific sections of academic content.
 * Supports two modes:
 * - Direct Mode: Save content directly to a chapter
 * - Agentic Mode: Generate content using AI with full context awareness
 * 
 * Uses a mutex lock to ensure sequential execution of section generation.
 * 
 * @module lib/tools/generate-section
 */

import { tool, generateText, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ChapterService } from '@/features/builder/services/chapterService';
import { selectModel } from '@/lib/ai/router';
import { COMMON_ACADEMIC_RULES, getChapterSpecificPrompt } from '@/features/bot/prompts/chapterPrompts';
import { ToolResult, toolSuccess, toolError } from './types';
import { validateToolContext } from './context-validation';

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
    }, { experimental_context }): Promise<ToolResult<GenerateSectionOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[generateSection] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

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
