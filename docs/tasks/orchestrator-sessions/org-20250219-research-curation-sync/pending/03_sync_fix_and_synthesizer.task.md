# Task: Create Synthesize Helper + Fix Sync Route

**Session ID:** org-20250219-research-curation-sync
**Source:** Orchestrator
**Priority:** P0
**Dependencies:** None (can run in parallel with Task 01)
**Created At:** 2026-02-19T01:00:00+01:00

---

## 📋 Objective

1. Create a helper function that converts research document metadata into plain-text for Gemini File Search upload
2. Fix the sync route to handle metadata-only documents (those without `fileData`)

## 🎯 Files

### File 1: `src/lib/synthesize-document.ts` [NEW]

Create a helper that converts a `ResearchDocument` (Prisma model) into a plain-text `Buffer` suitable for uploading to Gemini File Search as `text/plain`.

**The Prisma `ResearchDocument` model has these relevant fields:**
```
title: String
authors: String?               // Comma-separated for ACADEMIC
year: String?                   // Stringified year for ACADEMIC
abstractText: String?           // Abstract for ACADEMIC papers
snippet: String?                // Snippet for WEB sources
sourceType: String              // "ACADEMIC" | "WEB" | "USER_UPLOAD"
venue: String?                  // Journal/conference for ACADEMIC
citationCount: Int?             // For ACADEMIC
fileUrl: String?                // Original URL
openAccessUrl: String?          // Direct PDF link if available
```

```typescript
/**
 * Synthesize a plain-text document from research metadata.
 * Used to upload metadata-only research documents to Gemini File Search
 * so they become searchable by the Academic Copilot.
 */
export function synthesizeDocumentText(doc: {
  title: string;
  authors?: string | null;
  year?: string | null;
  abstractText?: string | null;
  snippet?: string | null;
  sourceType: string;
  venue?: string | null;
  citationCount?: number | null;
  fileUrl?: string | null;
  openAccessUrl?: string | null;
}): Buffer {
  const lines: string[] = [];

  // Header
  lines.push(`Title: ${doc.title}`);
  lines.push(`Source Type: ${doc.sourceType}`);

  if (doc.authors) {
    lines.push(`Authors: ${doc.authors}`);
  }

  if (doc.year) {
    lines.push(`Year: ${doc.year}`);
  }

  if (doc.venue) {
    lines.push(`Venue: ${doc.venue}`);
  }

  if (doc.citationCount != null && doc.citationCount > 0) {
    lines.push(`Citations: ${doc.citationCount}`);
  }

  // Separator
  lines.push('');
  lines.push('---');
  lines.push('');

  // Content body
  if (doc.abstractText) {
    lines.push('Abstract:');
    lines.push(doc.abstractText);
    lines.push('');
  }

  if (doc.snippet) {
    lines.push('Summary:');
    lines.push(doc.snippet);
    lines.push('');
  }

  // URLs for reference
  if (doc.fileUrl) {
    lines.push(`Source URL: ${doc.fileUrl}`);
  }

  if (doc.openAccessUrl) {
    lines.push(`Open Access PDF: ${doc.openAccessUrl}`);
  }

  const text = lines.join('\n');
  return Buffer.from(text, 'utf-8');
}
```

### File 2: `src/app/api/projects/[id]/research/sync/route.ts` [MODIFY]

**Current file:** 88 lines. The bug is on **line 36**:
```typescript
const unsyncedDocs = project.documents.filter(d => !d.importedToFileSearch && d.fileData);
```

This filter skips metadata-only documents. We need to include them and handle synthesis.

**Full replacement for the sync route logic (lines 35-75):**

Replace the filter and the loop with:

```typescript
// 3. Sync unsynced documents
// Include BOTH binary docs (user uploads) AND metadata-only docs (deep research)
const unsyncedDocs = project.documents.filter(d =>
  !d.importedToFileSearch && (d.fileData || d.abstractText || d.snippet)
);
const results = [];

for (const doc of unsyncedDocs) {
  try {
    let fileBuffer: Buffer;
    let mimeType: string;
    let fileName: string;

    if (doc.fileData) {
      // Binary document (user upload) — use original file data
      if (!doc.mimeType) {
        results.push({ id: doc.id, success: false, error: 'Missing mime type' });
        continue;
      }
      fileBuffer = doc.fileData;
      mimeType = doc.mimeType;
      fileName = doc.fileName;
    } else {
      // Metadata-only document (deep research) — synthesize text
      const { synthesizeDocumentText } = await import('@/lib/synthesize-document');
      fileBuffer = synthesizeDocumentText(doc);
      mimeType = 'text/plain';
      fileName = `${doc.title || doc.fileName} (Research Metadata).txt`;
    }

    const uploadResult = await GeminiFileSearchService.uploadDocument(
      storeId!,
      fileBuffer,
      fileName,
      mimeType
    );

    if (uploadResult.success) {
      await prisma.researchDocument.update({
        where: { id: doc.id },
        data: {
          importedToFileSearch: true,
          fileSearchFileId: uploadResult.fileId,
          importError: null
        }
      });
      results.push({ id: doc.id, success: true });
    } else {
      await prisma.researchDocument.update({
        where: { id: doc.id },
        data: { importError: uploadResult.error }
      });
      results.push({ id: doc.id, success: false, error: uploadResult.error });
    }

  } catch (error: any) {
    results.push({ id: doc.id, success: false, error: error.message });
  }
}
```

> **IMPORTANT:** The `await import(...)` is used for the synthesize helper to keep the import dynamic. Alternatively, you can add a static import at the top of the file:
> ```typescript
> import { synthesizeDocumentText } from '@/lib/synthesize-document';
> ```
> A static import is preferred. Choose whichever is cleaner.

## 🚫 Constraints

- Do NOT change the store creation logic (lines 1-33)
- Do NOT change the response format (lines 77-81)
- The synthesized text must include ALL available metadata fields
- The `Buffer.from()` call must use `'utf-8'` encoding
- `mimeType` for synthesized docs must be `'text/plain'`

## ✅ Definition of Done

- [ ] `src/lib/synthesize-document.ts` created with `synthesizeDocumentText()` function
- [ ] Sync route filter updated to include metadata-only docs
- [ ] Sync route handles both binary and metadata-only docs
- [ ] `npx tsc --noEmit` passes

---

*Generated by /mode-orchestrator*
