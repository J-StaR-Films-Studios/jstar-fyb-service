/**
 * Mutation Tool Constants
 * 
 * Extracted to a separate file so client components can import
 * these string constants WITHOUT pulling in server-side tool
 * implementations (which import AI SDKs, Prisma, etc.).
 * 
 * @module lib/tools/mutation-tools
 */

/**
 * List of tools that mutate data (for refresh triggers).
 */
export const MUTATION_TOOLS = [
    'generateSection',
    'addChapter',
    'generateChapterOutline',
    'saveUserContext',
] as const;

/**
 * Check if a tool is a mutation tool.
 */
export function isMutationTool(toolName: string): boolean {
    return MUTATION_TOOLS.includes(toolName as typeof MUTATION_TOOLS[number]);
}
