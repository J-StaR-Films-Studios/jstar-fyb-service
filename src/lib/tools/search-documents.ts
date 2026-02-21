/**
 * Search Documents Tool
 * 
 * Tool for searching through academic documents and research papers.
 * Uses Gemini File Search for grounded generation.
 * 
 * @module lib/tools/search-documents
 */

import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { GeminiFileSearchService, type GroundingChunk } from '@/lib/gemini-file-search';
import { ToolResult, toolSuccess, toolError } from './types';
import { validateToolContext } from './context-validation';

/**
 * Input schema for searchProjectDocuments tool
 */
const searchDocumentsSchema = z.object({
    query: z.string().describe('The search query to find relevant documents'),
});

/**
 * Output type for successful search
 */
interface SearchDocumentsOutput {
    text: string;
    sources: GroundingChunk[];
    hasDocuments: boolean;
}

/**
 * Search the full text of uploaded research documents.
 * Uses Gemini File Search for grounded generation.
 */
export const searchProjectDocumentsTool = tool({
    description: 'Search the full text of uploaded research documents to find relevant information, quotes, or data.',

    inputSchema: searchDocumentsSchema,

    execute: async ({ query }, { experimental_context }): Promise<ToolResult<SearchDocumentsOutput>> => {
        // Validate context first
        const ctxResult = validateToolContext(experimental_context);
        if (!ctxResult.success) {
            console.error('[searchProjectDocuments] Context validation failed:', ctxResult.error);
            return toolError(`Context error: ${ctxResult.error}`);
        }

        const { projectId } = ctxResult.data;

        try {
            // Get the file search store ID for this project
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { fileSearchStoreId: true },
            });

            if (!project?.fileSearchStoreId) {
                return toolSuccess<SearchDocumentsOutput>({
                    text: '',
                    sources: [],
                    hasDocuments: false,
                }, 'No research library has been created for this project. Please upload documents first.');
            }

            // Perform grounded search
            const result = await GeminiFileSearchService.generateWithGrounding(
                query,
                [project.fileSearchStoreId]
            );

            return toolSuccess<SearchDocumentsOutput>({
                text: result.text,
                sources: result.groundingChunks || [],
                hasDocuments: true,
            });

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[searchProjectDocuments] Error:', error);
            return toolError(`Search failed: ${message}`, { error });
        }
    },
});

/**
 * Type for frontend component rendering
 */
export type SearchDocumentsInvocation = UIToolInvocation<typeof searchProjectDocumentsTool>;

/**
 * Tool metadata for documentation
 */
export const searchProjectDocumentsMeta = {
    name: 'searchProjectDocuments',
    description: 'Search uploaded research documents for relevant information',
    category: 'research' as const,
    requiresContext: true,
};
