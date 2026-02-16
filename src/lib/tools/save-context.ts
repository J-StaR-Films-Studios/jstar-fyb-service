/**
 * Context Tools
 * 
 * Tools for saving user context and retrieving chapter guidelines.
 * 
 * @module lib/tools/save-context
 */

import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getChapterSpecificPrompt } from '@/features/bot/prompts/chapterPrompts';
import { ToolResult, toolSuccess, toolError, type ToolExecutionContext } from './types';

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
        const { projectId } = context as unknown as ToolExecutionContext;

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
