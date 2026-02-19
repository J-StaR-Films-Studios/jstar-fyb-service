# Task: Split ResearchService — Add searchOnly() + saveSelected()

**Session ID:** org-20250219-research-curation-sync
**Source:** Orchestrator
**Priority:** P0
**Dependencies:** None (first task)
**Created At:** 2026-02-19T01:00:00+01:00

---

## 📋 Objective

Add two new methods to `ResearchService` that split the current `executeHybridResearch()` into **search** (returns raw results) and **save** (persists user-selected results to DB).

## 🎯 Target File

**`src/features/research/services/researchService.ts`** (currently 184 lines)

## 📚 Current State

The file exports `ResearchService` with these methods:
- `generateResearchPlan(projectId)` — generates search queries (keep as-is)
- `executeHybridResearch(projectId, queries, deepGoal, onProgress)` — searches AND saves all results (keep for backward compat, but DO NOT modify)
- `saveAcademicPaper(projectId, paper)` — private, saves one academic paper
- `saveWebSource(projectId, source)` — private, saves one web source

**Imports at top of file:**
```typescript
import { prisma } from '@/lib/prisma';
import { ReasoningService } from './reasoningService';
import { SemanticScholarService, SemanticScholarPaper } from './semanticScholarService';
import { GeminiService, GroundedWebSource } from './geminiService';
```

## ✅ Changes to Make

### 1. Export a new interface for search results

Add this interface near the top of the file (after `ProgressCallback`):

```typescript
export interface HybridSearchResults {
  academic: SemanticScholarPaper[];
  web: GroundedWebSource[];
}
```

### 2. Add `searchOnly()` static method

Add this method to `ResearchService` class (after `executeHybridResearch`, before `saveAcademicPaper`):

```typescript
/**
 * Search-only mode: Runs hybrid search but does NOT save results.
 * Returns deduplicated results for the user to curate before saving.
 */
static async searchOnly(
  projectId: string,
  queries: string[],
  deepGoal: string,
  onProgress?: ProgressCallback
): Promise<HybridSearchResults> {
  try {
    onProgress?.({
      step: 'searching',
      message: `Searching: ${queries.length} academic queries + web grounding...`
    });

    // Run both searches in parallel
    const [academicPapers, webSources] = await Promise.all([
      SemanticScholarService.searchMultipleQueries(queries, 5),
      GeminiService.groundedSearch(deepGoal)
    ]);

    onProgress?.({
      step: 'processing',
      message: `Found ${academicPapers.length} academic papers and ${webSources.length} web sources. Deduplicating...`,
      details: { academic: academicPapers.length, web: webSources.length }
    });

    // Deduplicate by URL across both sources
    const seenUrls = new Set<string>();
    const uniqueAcademic: SemanticScholarPaper[] = [];
    const uniqueWeb: GroundedWebSource[] = [];

    for (const paper of academicPapers) {
      if (!seenUrls.has(paper.url)) {
        seenUrls.add(paper.url);
        uniqueAcademic.push(paper);
      }
    }

    for (const source of webSources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        uniqueWeb.push(source);
      }
    }

    onProgress?.({
      step: 'completed',
      message: `Search complete. Found ${uniqueAcademic.length} academic + ${uniqueWeb.length} web sources. Ready for curation.`,
      details: { academic: uniqueAcademic.length, web: uniqueWeb.length, total: uniqueAcademic.length + uniqueWeb.length }
    });

    return { academic: uniqueAcademic, web: uniqueWeb };

  } catch (error: any) {
    onProgress?.({ step: 'failed', message: error.message || 'Search failed' });
    throw error;
  }
}
```

### 3. Add `saveSelected()` static method

Add this method after `searchOnly()`:

```typescript
/**
 * Save only user-selected research results to the database.
 * Called after the user curates results from searchOnly().
 */
static async saveSelected(
  projectId: string,
  academicPapers: SemanticScholarPaper[],
  webSources: GroundedWebSource[]
): Promise<number> {
  let savedCount = 0;

  for (const paper of academicPapers) {
    try {
      await this.saveAcademicPaper(projectId, paper);
      savedCount++;
    } catch (e) {
      console.error(`[ResearchService] Failed to save paper: ${paper.title}`, e);
    }
  }

  for (const source of webSources) {
    try {
      await this.saveWebSource(projectId, source);
      savedCount++;
    } catch (e) {
      console.error(`[ResearchService] Failed to save web source: ${source.title}`, e);
    }
  }

  return savedCount;
}
```

### 4. Make saveAcademicPaper and saveWebSource public (change from private)

Change `private static` to `static` on both methods so the save route can call them directly if needed. This is a simple keyword change:

```diff
- private static async saveAcademicPaper(projectId: string, paper: SemanticScholarPaper) {
+ static async saveAcademicPaper(projectId: string, paper: SemanticScholarPaper) {
```

```diff
- private static async saveWebSource(projectId: string, source: GroundedWebSource) {
+ static async saveWebSource(projectId: string, source: GroundedWebSource) {
```

## 🚫 Constraints

- Do NOT modify `executeHybridResearch()` — it stays for backward compatibility
- Do NOT change existing imports
- Do NOT change `ResearchProgress` or `ProgressCallback` types
- The deduplication logic in `searchOnly()` must match the existing logic in `executeHybridResearch()`

## ✅ Definition of Done

- [ ] `HybridSearchResults` interface exported
- [ ] `searchOnly()` method added — searches without saving
- [ ] `saveSelected()` method added — saves only selected items
- [ ] `saveAcademicPaper` and `saveWebSource` changed from `private` to public
- [ ] `npx tsc --noEmit` passes
- [ ] File stays under 300 lines

---

*Generated by /mode-orchestrator*
