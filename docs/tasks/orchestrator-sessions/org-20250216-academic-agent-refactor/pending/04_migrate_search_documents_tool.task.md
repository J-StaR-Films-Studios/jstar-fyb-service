# Task: Migrate searchProjectDocuments Tool

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P1  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the `searchProjectDocuments` tool from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/search-documents.ts`.

---

## 🎯 Scope

**In Scope:**
- Create new tool definition using AI SDK v6 patterns
- Use `inputSchema` (not deprecated `parameters`)
- Return clean data structures (no embedded `[INSTRUCTION: ...]` tags)
- Export `UIToolInvocation` type for frontend
- Preserve exact functionality

**Out of Scope:**
- Modifying the original file (yet)
- Frontend changes
- Agent integration

---

## 📚 Context

### Original Implementation (academicTools.ts lines 36-62)

```typescript
searchProjectDocuments: tool({
    description: `Search the full text of uploaded research documents.`,
    inputSchema: z.object({
        query: z.string(),
    }),
    execute: async ({ query }: { query: string }) => {
        try {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { fileSearchStoreId: true }
            });

            if (!project?.fileSearchStoreId) {
                return "I cannot search documents because no research library has been created for this project. Please upload documents first.";
            }

            const result = await GeminiFileSearchService.generateWithGrounding(
                query,
                [project.fileSearchStoreId]
            );
            return `[SYSTEM: execution complete] Found in documents:\n${result.text}\nSOURCES: ${JSON.stringify(result.groundingChunks)}\n\n[INSTRUCTION: Summarize these findings for the user.]`;
        } catch (error: any) {
            console.error('[Chat Tool] Search failed:', error);
            return `Search failed: ${error.message || 'Unknown error'}. Please ignore this tool result.`;
        }
    }
}),
```

### Dependencies
- `prisma` from `@/lib/prisma`
- `GeminiFileSearchService` from `@/lib/gemini-file-search`
- `projectId` from context

### Issues to Fix
1. ❌ Returns string with embedded `[INSTRUCTION: ...]` - must remove
2. ❌ Error handling returns string instead of structured error
3. ❌ No type export for frontend

---

## 🔧 New Implementation

```typescript
// src/lib/tools/search-documents.ts
import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { ToolResult, toolSuccess, toolError } from './types';

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
  sources: Array<{
    title?: string;
    uri?: string;
    [key: string]: unknown;
  }>;
  hasDocuments: boolean;
}

/**
 * Search the full text of uploaded research documents.
 * Uses Gemini File Search for grounded generation.
 */
export const searchProjectDocumentsTool = tool({
  description: 'Search the full text of uploaded research documents to find relevant information, quotes, or data.',
  
  inputSchema: searchDocumentsSchema,
  
  execute: async ({ query }, context): Promise<ToolResult<SearchDocumentsOutput>> => {
    const { projectId } = context as ToolExecutionContext;
    
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
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/search-documents.ts` created
- [ ] Tool uses `inputSchema` (not `parameters`)
- [ ] Returns clean `ToolResult<SearchDocumentsOutput>` type
- [ ] No embedded `[INSTRUCTION: ...]` tags in return values
- [ ] `SearchDocumentsInvocation` type exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors
- [ ] Imports are correct (prisma, GeminiFileSearchService, types)

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/search-documents.ts` | Migrated tool |

---

## 🚫 Constraints

- Preserve exact functionality
- Don't change the Gemini grounding behavior
- Keep error logging
- Use proper TypeScript types throughout

---

## 📝 Testing Notes

After integration, verify:
1. Tool still searches documents correctly
2. Sources are returned properly
3. Error case (no file store) handled gracefully
4. Frontend can render the result properly

---

*Generated by vibe-orchestrator mode*
