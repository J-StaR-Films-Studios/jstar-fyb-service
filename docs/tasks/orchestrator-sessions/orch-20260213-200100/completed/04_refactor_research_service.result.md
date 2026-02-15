# Task Completion: Refactor Research Service — Hybrid Orchestration

**Task ID:** 04_refactor_research_service.task.md  
**Session ID:** orch-20260213-200100  
**Completed At:** 2026-02-13T21:15:00  
**Mode:** vibe-code

---

## ✅ Results

Completely rewrote `researchService.ts` to orchestrate the Hybrid Research flow: Semantic Scholar (academic papers) + Gemini Grounding (web sources) running in parallel. Removed binary downloads from the research flow while keeping `downloadAndSaveSource` for document uploads.

---

## 📁 Files Modified

| File | Change |
|------|--------|
| `src/features/research/services/researchService.ts` | Rewritten with hybrid flow |
| `src/app/api/research/execute/route.ts` | Updated to use new API |
| `src/services/researchClient.ts` | Updated client interface |
| `src/features/research/components/ResearchModal.tsx` | Updated UI to match new API |
| `src/features/research/components/ResearchProgress.tsx` | Fixed step type |

---

## 🔧 Implementation Details

### New Flow
```
ResearchService.executeHybridResearch(projectId, queries, deepGoal)
  → PARALLEL:
    ├── SemanticScholarService.searchMultipleQueries(queries)
    │   → Returns: SemanticScholarPaper[]
    └── GeminiService.groundedSearch(deepGoal)
        → Returns: GroundedWebSource[]
  → Deduplicate by URL
  → Save all as ResearchDocument (metadata only, NO binary)
  → Stream progress via onProgress callback
```

### Method Signatures
```typescript
class ResearchService {
  // New hybrid research
  static async executeHybridResearch(
    projectId: string,
    queries: string[],
    deepGoal: string,
    onProgress?: ProgressCallback
  ): Promise<number>;

  // Kept for plan generation
  static async generateResearchPlan(projectId: string): Promise<SearchQueries>;

  // Kept for document uploads (separate from research flow)
  static async downloadAndSaveSource(projectId: string, url: string, title: string);

  // Kept for URL optimization
  static optimizeDownloadUrl(url: string): string;
}
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

---

## ✅ Definition of Done

- [x] `researchService.ts` rewritten with `executeHybridResearch`
- [x] Parallel execution of Semantic Scholar + Gemini Grounding
- [x] Results deduplicated by URL
- [x] Records saved as metadata-only (no `fileData` in hybrid flow)
- [x] `smartDownload` kept for document uploads only
- [x] `execute/route.ts` updated
- [x] Progress streaming still works
- [x] TypeScript passes: `npx tsc --noEmit`
- [x] File stays under 200 lines

---

## 🔍 Verification Output

### TypeScript Check
```
✔ npx tsc --noEmit - PASSED (no errors)
```

### API Changes
- Removed `mode` parameter (no more "standard" vs "deep" split)
- Now requires both `queries` and `deepGoal`
- Returns metadata-only records for research sources

---

## 📝 Notes

- `downloadAndSaveSource` preserved for document upload functionality
- `optimizeDownloadUrl` preserved as utility for students clicking through to PDFs
- Progress streaming unchanged — same callback interface
- UI updated to match new single hybrid mode

---

*Completed by vibe-code mode*
