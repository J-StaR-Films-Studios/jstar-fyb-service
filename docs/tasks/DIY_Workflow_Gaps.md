# DIY Writing Workflow - Gap Completion Task

> **Priority**: 🟡 MEDIUM  
> **Estimated Effort**: 2-3 days  
> **Created**: 2026-01-05  
> **Source**: Codebase audit comparing `DIY_Writing_Workflow.md` plan vs actual implementation

---

## Executive Summary

This task addresses all identified gaps from the Phase 1 & 2 implementation audit. These are features that were either marked as "Known Gaps" or had placeholder implementations.

---

## Task Categories

```
┌─────────────────────────────────────────────────────────────────────┐
│ CATEGORY A: Phase 1 Known Gaps (Core Writing UX)                    │
│ ─────────────────────────────────────────────────────────────────── │
│ • Version History UI                                                 │
│ • Debounced Auto-Save                                                │
│ • "Enhance with AI" button                                           │
│ • Rich Text Formatting                                               │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CATEGORY B: Phase 2 Verification Gaps (Research Integration)        │
│ ─────────────────────────────────────────────────────────────────── │
│ • Citation formatting verification                                   │
│ • References section auto-generation                                 │
│ • FileSearchStore cleanup on project delete                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CATEGORY A: Phase 1 Known Gaps

### A.1 Version History UI

**Status**: 🔴 Not Implemented  
**Location**: `src/features/builder/components/v2/ChapterEditor.tsx`

**Requirements**:
1. Add "Version History" dropdown/sidebar in ChapterEditor
2. Fetch versions from `GET /api/projects/[id]/chapters/[chapterNumber]/versions`
3. Display version list with timestamps and word count diffs
4. Allow preview of previous versions (read-only modal)
5. Add "Restore this version" button that calls PATCH endpoint

**Components to Create**:
- [ ] `VersionHistoryDropdown.tsx` - Dropdown trigger + panel
- [ ] `VersionPreviewModal.tsx` - Read-only diff view

**API Already Exists**: ✅ `versions/route.ts` endpoint is implemented

**Implementation Notes**:
```typescript
// Fetch versions
const versions = await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}/versions`);

// Display format
interface Version {
  version: number;
  content: string;
  createdAt: string;
  wordCount?: number;
}
```

**Definition of Done**:
- [ ] User can see version history for any chapter
- [ ] User can preview any previous version
- [ ] User can restore a previous version
- [ ] Current version is highlighted in the list

---

### A.2 Debounced Auto-Save

**Status**: 🔴 Not Implemented (saves on every keystroke currently)  
**Location**: `src/features/builder/components/v2/WritingCanvas.tsx`, `SectionEditor.tsx`

**Requirements**:
1. Implement debounce (1-2 second delay after last keystroke)
2. Show "Saving..." indicator during save
3. Show "Saved" indicator after successful save
4. Show "Error" indicator on failure with retry option

**Implementation**:
```typescript
// Use useDebouncedCallback from 'use-debounce' or custom hook
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(async (content: string) => {
  setSaveStatus('saving');
  try {
    await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
    setSaveStatus('saved');
  } catch (error) {
    setSaveStatus('error');
  }
}, 1500); // 1.5 second debounce
```

**Dependencies**:
```bash
pnpm add use-debounce
```

**Definition of Done**:
- [ ] Typing doesn't trigger constant API calls
- [ ] Save indicator shows correct state transitions
- [ ] No data loss on rapid edits
- [ ] Works on both desktop (WritingCanvas) and mobile (SectionEditor)

---

### A.3 "Enhance with AI" Button

**Status**: 🔴 Placeholder Only  
**Location**: `src/features/builder/components/v2/SectionEditor.tsx` (line ~71)

**Requirements**:
1. Wire the existing "Enhance" button to AI endpoint
2. Send current section content + context to AI
3. Stream improved content back
4. Show diff/preview before applying
5. User can accept/reject changes

**API Endpoint to Create**:
```
POST /api/projects/[id]/chapters/[chapterNumber]/enhance
Body: { sectionContent: string, enhanceType: 'clarity' | 'academic' | 'expand' | 'shorten' }
Response: StreamedText
```

**Components to Create**:
- [ ] `EnhanceOptionsPopover.tsx` - Choose enhancement type
- [ ] `EnhanceDiffPreview.tsx` - Show before/after with accept/reject

**Implementation Flow**:
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Click Enhance   │ ──► │ Choose Type     │ ──► │ Stream Response │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Apply Changes   │ ◄── │ Accept/Reject   │ ◄── │ Show Diff       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Definition of Done**:
- [ ] Enhance button opens options popover
- [ ] AI response streams in with loading indicator
- [ ] User can preview changes before applying
- [ ] Applied changes trigger debounced save

---

### A.4 Rich Text Formatting Buttons

**Status**: 🔴 Placeholder Icons Only  
**Location**: `src/features/builder/components/v2/SectionEditor.tsx` (lines ~57-63)

**Requirements**:
1. Make Bold, Heading, List, Image buttons functional
2. Insert Markdown syntax at cursor position
3. Handle text selection (wrap selected text)

**Implementation**:
```typescript
const insertFormatting = (format: 'bold' | 'heading' | 'list' | 'image') => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = editedContent.substring(start, end);
  
  let newText = '';
  switch (format) {
    case 'bold':
      newText = `**${selectedText || 'bold text'}**`;
      break;
    case 'heading':
      newText = `\n## ${selectedText || 'Heading'}\n`;
      break;
    case 'list':
      newText = `\n- ${selectedText || 'List item'}\n`;
      break;
    case 'image':
      newText = `![${selectedText || 'alt text'}](url)`;
      break;
  }
  
  const newContent = editedContent.substring(0, start) + newText + editedContent.substring(end);
  setEditedContent(newContent);
};
```

**Definition of Done**:
- [ ] Bold button wraps text in `**...**`
- [ ] Heading button inserts `## ...`
- [ ] List button inserts `- ...`
- [ ] Image button opens URL input modal or inserts placeholder
- [ ] Cursor position maintained after insertion

---

## CATEGORY B: Phase 2 Verification Gaps

### B.1 Citation Formatting Verification

**Status**: 🟠 Needs Testing  
**Location**: `src/app/api/generate/chapter/route.ts`

**Requirements**:
1. Verify citations appear as `(Author, Year)` in generated text
2. Ensure groundingChunks are parsed correctly
3. Test with real uploaded PDFs

**Verification Steps**:
- [ ] Upload 2-3 research PDFs to a test project
- [ ] Generate Chapter 2 (Literature Review)
- [ ] Confirm inline citations appear
- [ ] Confirm they reference actual uploaded documents

**If Broken, Fix**:
```typescript
// In chapter generation, after stream completes
const citation = groundingChunk.retrievedContext?.title 
  ? `(${extractAuthorYear(groundingChunk.retrievedContext.title)})`
  : '';
```

---

### B.2 References Section Auto-Generation

**Status**: 🟠 Needs Testing  
**Location**: `src/app/api/generate/chapter/route.ts`

**Requirements**:
1. After chapter generation, append "References" section
2. Build from `groundingChunks` array returned by Gemini
3. Format as APA/Harvard style

**Verification Steps**:
- [ ] Generate chapter with grounded content
- [ ] Check if `## References` section exists at bottom
- [ ] Verify references match cited sources

**If Missing, Implement**:
```typescript
// After stream completes
const references = groundingChunks.map(chunk => {
  const ctx = chunk.retrievedContext;
  return `- ${ctx.title || 'Unknown'} (${ctx.uri || 'N/A'})`;
}).join('\n');

const contentWithRefs = `${chapterContent}\n\n## References\n\n${references}`;
await saveChapterToDb(projectId, chapterNumber, contentWithRefs);
```

---

### B.3 FileSearchStore Cleanup on Project Delete

**Status**: 🟠 Needs Verification  
**Location**: Project deletion endpoint (unknown)

**Requirements**:
1. When project is deleted, call `GeminiFileSearchService.deleteStore()`
2. Prevent orphaned FileSearchStores in Gemini account

**Verification Steps**:
- [ ] Find project deletion endpoint/action
- [ ] Check if `deleteStore` is called
- [ ] If not, wire it up

**Implementation Location**:
```typescript
// Wherever project deletion happens (likely Prisma cascade or API route)
import { GeminiFileSearchService } from '@/lib/gemini-file-search';

// Before or after Prisma delete
if (project.fileSearchStoreId) {
  await GeminiFileSearchService.deleteStore(project.fileSearchStoreId);
}
```

---

## Implementation Order (Recommended)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| 1 | A.2 Debounced Auto-Save | 1 hour | None |
| 2 | A.4 Rich Text Formatting | 2 hours | None |
| 3 | B.3 FileSearchStore Cleanup | 30 min | Find delete endpoint |
| 4 | B.1 & B.2 Citation Verification | 1-2 hours | Test data |
| 5 | A.1 Version History UI | 3-4 hours | A.2 (for save status) |
| 6 | A.3 Enhance with AI | 4-6 hours | New API endpoint |

---

## Files to Modify/Create

### Modify
- `src/features/builder/components/v2/WritingCanvas.tsx` - Debounced save
- `src/features/builder/components/v2/SectionEditor.tsx` - Formatting + Enhance
- `src/features/builder/components/v2/ChapterEditor.tsx` - Version history UI
- `src/app/api/generate/chapter/route.ts` - Citation/References fix (if needed)

### Create
- `src/features/builder/components/v2/VersionHistoryDropdown.tsx`
- `src/features/builder/components/v2/EnhanceOptionsPopover.tsx`
- `src/app/api/projects/[id]/chapters/[chapterNumber]/enhance/route.ts`

### Verify/Update
- Project deletion handler (add FileSearchStore cleanup)

---

## Self-Review Template

### Before Marking Complete
- [ ] All debounced saves work correctly
- [ ] Version history shows and restores properly
- [ ] Enhance button produces useful AI improvements
- [ ] Rich text buttons insert correct Markdown
- [ ] Citations verified on real test project
- [ ] FileSearchStore cleanup confirmed
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Tested on mobile and desktop
