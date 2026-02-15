# Task: Refactor Research Service — Hybrid Orchestration

**Session ID:** orch-20260213-200100
**Source:** Orchestrator (Hybrid Research Feature - Option 3)
**Context:** Core rewrite. `researchService.ts` must orchestrate Semantic Scholar + Gemini Grounding in parallel, remove binary downloads, and save metadata-only records.
**Priority:** P0
**Dependencies:** 02_semantic_scholar_service.task.md, 03_refactor_gemini_grounding.task.md
**Created At:** 2026-02-13T20:01:00

---

## 📋 Objective

Rewrite `src/features/research/services/researchService.ts` to orchestrate the Hybrid Research flow: Semantic Scholar (academic papers) + Gemini Grounding (web sources), running in parallel. Remove all binary download logic.

## 🎯 Scope

**In Scope:**
- Rewrite `researchService.ts` with new hybrid flow
- Remove `smartDownload` import/dependency from research flow
- Remove binary `fileData` storage from research flow
- Add deduplication across both sources (by URL)
- Update `processResults` to save metadata-only records
- Update `src/app/api/research/execute/route.ts` if method signatures change
- Update `src/services/researchClient.ts` if API contract changes
- `reasoningService.ts` stays unchanged (query generation works fine)
- Verify with `npx tsc --noEmit`

**Out of Scope:**
- UI changes (done in task 05)
- `smartBrowser.ts` itself (keep for document uploads)

## 📚 Context

### Current Flow (Broken)
```
ReasoningService → search queries
  → searchWeb() via OpenRouter Exa plugin (UNRELIABLE)
  → smartDownload() for each URL (BLOCKED BY WAFs)
  → Store binary fileData in DB (EXCEEDS VERCEL LIMITS)
```

### New Flow (Hybrid)
```
researchService.executeHybridResearch(projectId, queries, deepGoal)
  → PARALLEL:
    ├── SemanticScholarService.searchMultipleQueries(queries)
    │   → Returns: SemanticScholarPaper[]
    └── GeminiService.groundedSearch(deepGoal)
        → Returns: GroundedWebSource[]
  → Deduplicate by URL
  → Save all as ResearchDocument (metadata only, NO binary)
  → Stream progress via onProgress callback
```

### DB Record Shape (Academic)
```typescript
prisma.researchDocument.create({
  data: {
    projectId,
    title: paper.title,
    fileUrl: paper.url,
    openAccessUrl: paper.openAccessPdfUrl,
    sourceType: 'ACADEMIC',
    citationCount: paper.citationCount,
    abstractText: paper.abstract,
    authors: paper.authors.join(', '),
    year: String(paper.year),
    venue: paper.venue,
    semanticScholarId: paper.paperId,
    fileName: paper.title.substring(0, 100),
    fileType: 'PDF',
    status: 'INDEXED',
  }
});
```

### DB Record Shape (Web)
```typescript
prisma.researchDocument.create({
  data: {
    projectId,
    title: source.title,
    fileUrl: source.url,
    sourceType: 'WEB',
    snippet: source.snippet,
    fileName: source.title.substring(0, 100),
    fileType: 'WEB',
    status: 'INDEXED',
  }
});
```

### Method Signatures
```typescript
export class ResearchService {
  static async executeHybridResearch(
    projectId: string, queries: string[], deepGoal: string,
    onProgress?: ProgressCallback
  ): Promise<number>;

  static async generateResearchPlan(projectId: string): Promise<SearchQueries>; // KEEP

  // REMOVE: executeStandardResearch, executeDeepResearch, searchWeb, downloadAndSaveSource
  // KEEP: optimizeDownloadUrl (still useful)
}
```

### API Route Update
Update `src/app/api/research/execute/route.ts`:
- Remove `mode` parameter (no more "standard" vs "deep" split)
- Accept both `queries` and `deepGoal`
- Call `ResearchService.executeHybridResearch()`

### Key Files
| File | Role |
|------|------|
| `src/features/research/services/researchService.ts` | **REWRITE** |
| `src/features/research/services/semanticScholarService.ts` | Academic search (task 02) |
| `src/features/research/services/geminiService.ts` | Web search (task 03) |
| `src/features/research/services/reasoningService.ts` | Query gen (KEEP) |
| `src/app/api/research/execute/route.ts` | Update |
| `src/services/researchClient.ts` | Update if needed |

---

## ✅ Definition of Done

- [x] `researchService.ts` rewritten with `executeHybridResearch`
- [x] Parallel execution of Semantic Scholar + Gemini Grounding
- [x] Results deduplicated by URL
- [x] Records saved as metadata-only (no `fileData`)
- [x] `smartDownload` import removed from hybrid flow (kept for document uploads)
- [x] `execute/route.ts` updated
- [x] Progress streaming still works
- [x] TypeScript passes: `npx tsc --noEmit`
- [x] File stays under 200 lines

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/features/research/services/researchService.ts` | Rewritten |
| `src/app/api/research/execute/route.ts` | Updated |
| `src/services/researchClient.ts` | Updated (if needed) |
| `docs/tasks/orchestrator-sessions/orch-20260213-200100/completed/04_refactor_research_service.result.md` | Results |

## 🚫 Constraints

- Do NOT modify `reasoningService.ts`
- Do NOT delete `smartBrowser.ts`
- Do NOT store binary `fileData` for research results
- Do NOT add new npm packages
- Keep backward compatibility with existing records
- Create `.result.md` with verification output

---
*Generated by vibe-orchestrator mode*
