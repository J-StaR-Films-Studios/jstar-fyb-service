# Task Result: Fix Document Source Type for Uploads

**Session ID:** org-20250218-workspace-chat-docs-fix
**Completed At:** 2026-02-18
**Status:** Complete

---

## Summary

Fixed the document categorization so user-uploaded files appear in the "Uploaded" tab instead of the "Web" tab.

---

## Changes Made

### File: `src/app/api/documents/upload/route.ts`

Added `sourceType: "USER_UPLOAD"` when creating `ResearchDocument` records (line 201).

### File: `prisma/schema.prisma`

Updated comment to document the new `USER_UPLOAD` value:
```prisma
sourceType String @default("WEB") // "ACADEMIC", "WEB", or "USER_UPLOAD"
```

---

## Verification

- [x] `npx tsc --noEmit` passes
- [x] No migration needed (string field)
- [x] Schema comment updated

---

## Manual Testing Required

User should verify:
1. Upload a PDF/document
2. Check that it appears in "Uploaded" tab, not "Web" tab
