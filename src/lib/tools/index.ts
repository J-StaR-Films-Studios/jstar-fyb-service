/**
 * Tool Registry
 * 
 * Central registry for all academic tools. Tools are organized by category
 * and exported as a cohesive tool set for use with ToolLoopAgent.
 * 
 * @module lib/tools
 */

import { ToolSet } from 'ai';

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
    ToolExecutionContext,
    ToolResult,
    ToolSuccess,
    ToolError,
    ToolCategory,
    ToolMetadata,
    ToolFactory,
} from './types';

export { toolSuccess, toolError } from './types';

// ============================================================
// IMPORT TOOLS (for internal use + re-export)
// ============================================================

// Research Tools
import {
    searchProjectDocumentsTool,
    searchProjectDocumentsMeta,
    type SearchDocumentsInvocation,
} from './search-documents';

// Content Tools
import {
    suggestEditTool,
    suggestEditMeta,
    type SuggestEditInvocation,
} from './suggest-edit';

import {
    generateSectionTool,
    generateSectionMeta,
    type GenerateSectionInvocation,
} from './generate-section';

// Diagram Tools
import {
    generateDiagramTool,
    generateDiagramMeta,
    type GenerateDiagramInvocation,
} from './generate-diagram';

// Chapter Tools
import {
    listChaptersTool,
    loadChapterTool,
    addChapterTool,
    generateChapterOutlineTool,
    chapterToolsMeta,
    type ListChaptersInvocation,
    type LoadChapterInvocation,
    type AddChapterInvocation,
    type GenerateChapterOutlineInvocation,
} from './chapter-tools';

// Context Tools
import {
    saveUserContextTool,
    getChapterGuidelinesTool,
    contextToolsMeta,
    type SaveUserContextInvocation,
    type GetChapterGuidelinesInvocation,
} from './save-context';

// ============================================================
// RE-EXPORT ALL TOOLS
// ============================================================

// Research Tools
export {
    searchProjectDocumentsTool,
    searchProjectDocumentsMeta,
    type SearchDocumentsInvocation,
};

// Content Tools
export {
    suggestEditTool,
    suggestEditMeta,
    type SuggestEditInvocation,
};

export {
    generateSectionTool,
    generateSectionMeta,
    type GenerateSectionInvocation,
};

// Diagram Tools
export {
    generateDiagramTool,
    generateDiagramMeta,
    type GenerateDiagramInvocation,
};

// Chapter Tools
export {
    listChaptersTool,
    loadChapterTool,
    addChapterTool,
    generateChapterOutlineTool,
    chapterToolsMeta,
    type ListChaptersInvocation,
    type LoadChapterInvocation,
    type AddChapterInvocation,
    type GenerateChapterOutlineInvocation,
};

// Context Tools
export {
    saveUserContextTool,
    getChapterGuidelinesTool,
    contextToolsMeta,
    type SaveUserContextInvocation,
    type GetChapterGuidelinesInvocation,
};

// ============================================================
// TOOL SET FOR AGENT
// ============================================================

/**
 * All academic tools combined into a single tool set.
 * Import this when creating the ToolLoopAgent.
 */
export const academicTools = {
    // Research
    searchProjectDocuments: searchProjectDocumentsTool,

    // Content
    suggestEdit: suggestEditTool,
    generateSection: generateSectionTool,

    // Diagrams
    generateDiagram: generateDiagramTool,

    // Chapter Management
    listChapters: listChaptersTool,
    loadChapter: loadChapterTool,
    addChapter: addChapterTool,
    generateChapterOutline: generateChapterOutlineTool,

    // Context
    saveUserContext: saveUserContextTool,
    getChapterGuidelines: getChapterGuidelinesTool,
} as const;

/**
 * Type of the full academic tools set.
 * Use this for type inference in the agent.
 */
export type AcademicTools = typeof academicTools;

/**
 * Infer the tool set type for the agent.
 */
export type AcademicToolSet = ToolSet & AcademicTools;

// ============================================================
// TOOL METADATA REGISTRY
// ============================================================

/**
 * Metadata for all tools, organized by category.
 * Useful for documentation and UI rendering.
 */
export const toolMetadata = {
    research: [searchProjectDocumentsMeta],
    content: [suggestEditMeta, generateSectionMeta],
    diagram: [generateDiagramMeta],
    chapter: [
        chapterToolsMeta.listChapters,
        chapterToolsMeta.loadChapter,
        chapterToolsMeta.addChapter,
        chapterToolsMeta.generateChapterOutline,
    ],
    context: [contextToolsMeta.saveUserContext, contextToolsMeta.getChapterGuidelines],
} as const;

// ============================================================
// MUTATION TOOLS (re-exported from client-safe module)
// ============================================================

export { MUTATION_TOOLS, isMutationTool } from './mutation-tools';
