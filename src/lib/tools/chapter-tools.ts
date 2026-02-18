/**
 * Chapter Tools
 * 
 * Tools for managing chapter structure in academic documents.
 * Includes listChapters, loadChapter, addChapter, and generateChapterOutline.
 * 
 * @module lib/tools/chapter-tools
 */

import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ChapterService } from '@/features/builder/services/chapterService';
import { ToolResult, toolSuccess, toolError } from './types';
import { validateToolContext } from './context-validation';

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

    execute: async (_, { experimental_context }): Promise<ToolResult<ListChaptersOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[listChapters] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

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

    execute: async ({ chapterNumber }, { experimental_context }): Promise<ToolResult<LoadChapterOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[loadChapter] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

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

    execute: async ({ number, title, initialContent }, { experimental_context }): Promise<ToolResult<AddChapterOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[addChapter] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

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

    execute: async ({ focus }, { experimental_context }): Promise<ToolResult<GenerateChapterOutlineOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[generateChapterOutline] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

        try {
            // Service fetches topic from DB
            const outline = await ChapterService.generateOutline(projectId, {
                topic: '',
                focus,
            });

            // Transform the outline to our interface format
            const outlineItems: OutlineItem[] = Array.isArray(outline)
                ? outline.map((item: { number: number; title: string; description?: string }) => ({
                    number: item.number,
                    title: item.title,
                    description: item.description,
                }))
                : [];

            return toolSuccess<GenerateChapterOutlineOutput>({
                outline: outlineItems,
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
