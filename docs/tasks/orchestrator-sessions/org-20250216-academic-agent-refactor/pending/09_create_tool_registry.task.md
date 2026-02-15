# Task: Create Tool Registry

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration (Final)  
**Priority:** P0  
**Dependencies:** 04, 05, 06, 07, 08 (all tool migrations)  
**Created At:** 2026-02-16

---

## 📋 Objective

Create the centralized tool registry that imports all individual tools and exports them as a cohesive tool set for use by the `ToolLoopAgent`. This also includes creating the context factory that injects `projectId`, `conversationId`, and other context into tool execution.

---

## 🎯 Scope

**In Scope:**
- Create `src/lib/tools/index.ts` as the tool registry
- Import all migrated tools
- Create a tool factory function that accepts context and returns the full tool set
- Export all types and metadata
- Create context injection mechanism

**Out of Scope:**
- Creating the agent (next task)
- Frontend changes

---

## 📚 Context

### Tool Files Created
- `src/lib/tools/search-documents.ts` → `searchProjectDocumentsTool`
- `src/lib/tools/suggest-edit.ts` → `suggestEditTool`
- `src/lib/tools/generate-diagram.ts` → `generateDiagramTool`
- `src/lib/tools/generate-section.ts` → `generateSectionTool`
- `src/lib/tools/chapter-tools.ts` → `listChaptersTool`, `loadChapterTool`, `addChapterTool`, `generateChapterOutlineTool`
- `src/lib/tools/save-context.ts` → `saveUserContextTool`, `getChapterGuidelinesTool`

### AI SDK v6 Context Injection
Tools receive context via the second parameter of `execute`. The context is passed through `experimental_context` in the agent settings, and the agent forwards it to each tool execution.

---

## 🔧 Implementation

```typescript
// src/lib/tools/index.ts
/**
 * Tool Registry
 * 
 * Central registry for all academic tools. Tools are organized by category
 * and exported as a cohesive tool set for use with ToolLoopAgent.
 * 
 * @module lib/tools
 */

import { ToolSet } from 'ai';

// Types
export type { 
  ToolExecutionContext, 
  ToolResult, 
  ToolSuccess, 
  ToolError,
  ToolCategory,
  ToolMetadata,
} from './types';

export { toolSuccess, toolError } from './types';

// Research Tools
export { 
  searchProjectDocumentsTool,
  searchProjectDocumentsMeta,
  type SearchDocumentsInvocation,
} from './search-documents';

// Content Tools
export { 
  suggestEditTool,
  suggestEditMeta,
  type SuggestEditInvocation,
} from './suggest-edit';

export { 
  generateSectionTool,
  generateSectionMeta,
  type GenerateSectionInvocation,
} from './generate-section';

// Diagram Tools
export { 
  generateDiagramTool,
  generateDiagramMeta,
  type GenerateDiagramInvocation,
} from './generate-diagram';

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
} from './chapter-tools';

// Context Tools
export { 
  saveUserContextTool,
  getChapterGuidelinesTool,
  contextToolsMeta,
  type SaveUserContextInvocation,
  type GetChapterGuidelinesInvocation,
} from './save-context';

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
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/index.ts` created
- [ ] All tools imported and re-exported
- [ ] `academicTools` object created with all tools
- [ ] `AcademicTools` and `AcademicToolSet` types exported
- [ ] All tool invocation types re-exported
- [ ] `toolMetadata` registry created
- [ ] `MUTATION_TOOLS` list created
- [ ] `isMutationTool` helper function created
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/index.ts` | Central tool registry |

---

## 🚫 Constraints

- Keep exports organized by category
- Ensure all types are properly exported
- Don't forget any tools

---

## 📝 Verification

After creation, verify:
```bash
npx tsc --noEmit
```

Should compile without errors. Also verify imports work:
```typescript
import { academicTools, AcademicTools, MUTATION_TOOLS } from '@/lib/tools';
```

---

*Generated by vibe-orchestrator mode*
