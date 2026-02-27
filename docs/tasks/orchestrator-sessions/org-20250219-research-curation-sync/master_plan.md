# Master Plan: Deep Research Curation & File Search Sync

**Session ID:** org-20250219-research-curation-sync
**Created:** 2026-02-19T01:00:00+01:00
**Status:** ✅ Complete

## Overview

Split the deep research pipeline into **search → curate → save → sync**. Users can select which papers to keep, bulk-deselect paywalled papers, and manually sync to Gemini File Search for AI search.

## Tasks

| # | Task File | Status | Mode | Description |
|---|-----------|--------|------|-------------|
| 1 | `01_backend_service_split.task.md` | ✅ Complete | `vibe-code` | Split `researchService.ts`: add `searchOnly()` + `saveSelected()` |
| 2 | `02_backend_api_routes.task.md` | ✅ Complete | `vibe-code` | Create `/api/research/search` + `/api/research/save` routes |
| 3 | `03_sync_fix_and_synthesizer.task.md` | ✅ Complete | `vibe-code` | Create `synthesize-document.ts` + fix sync route filter |
| 4 | `04_frontend_client.task.md` | ✅ Complete | `vibe-code` | Update `researchClient.ts` with new methods |
| 5 | `05_frontend_curation_ui.task.md` | ✅ Complete | `vibe-code` | Add curation step to `ResearchModal.tsx` |

## Dependency Graph

```
Task 1 (Service Split)
  ├── Task 2 (API Routes) ← depends on Task 1
  └── Task 3 (Sync Fix) ← independent

Task 4 (Client Methods) ← depends on Task 2
Task 5 (Curation UI) ← depends on Task 4
```

**Parallel opportunities:** Tasks 1 & 3 can run in parallel.

## Progress
- [x] Task 1: Backend service split
- [x] Task 2: Backend API routes
- [x] Task 3: Sync fix & synthesizer
- [x] Task 4: Frontend client methods
- [x] Task 5: Frontend curation UI
- [x] Final: `npx tsc --noEmit` verification ✅ PASS

## Key Types (Reference)

```typescript
// src/features/research/services/semanticScholarService.ts
interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  citationCount: number;
  openAccessPdfUrl: string | null;
  url: string;
  venue: string | null;
}

// src/features/research/services/geminiService.ts
interface GroundedWebSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: 'WEB';
}

// src/features/research/services/researchService.ts
interface ResearchProgress {
  step: 'planning' | 'searching' | 'processing' | 'completed' | 'failed';
  message: string;
  details?: { academic?: number; web?: number; total?: number };
}
```
