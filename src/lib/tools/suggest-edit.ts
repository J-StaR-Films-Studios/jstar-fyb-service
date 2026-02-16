/**
 * Suggest Edit Tool
 * 
 * Tool for suggesting specific content revisions for chapters or sections.
 * Used when the user asks to "rewrite", "improve", "fix", or "change" specific text.
 * 
 * @module lib/tools/suggest-edit
 */

import { tool, type UIToolInvocation } from 'ai';
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
