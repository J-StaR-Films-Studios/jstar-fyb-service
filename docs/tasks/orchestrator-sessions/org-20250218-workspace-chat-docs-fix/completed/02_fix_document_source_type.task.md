# Task: Fix Document Source Type for Uploads

**Session ID:** org-20250218-workspace-chat-docs-fix
**Source:** Orchestrator
**Context:** User-uploaded documents show in "Web" tab instead of "Uploaded" tab in Research Library
**Priority:** P1
**Dependencies:** None
**Created At:** 2026-02-18T22:57:00+01:00

---

## 📋 Objective

Fix the document categorization so user-uploaded files appear in the "Uploaded" tab.

## 🎯 Scope

**In Scope:**
- Set `sourceType: 'USER_UPLOAD'` in upload API
- Update schema comment

**Out of Scope:**
- Frontend tab logic (already works correctly — it categorizes anything not `ACADEMIC`/`WEB` as uploaded)
- Migration (string field, no migration needed)

## 📚 Context

### Root Cause
The upload API (`/api/documents/upload/route.ts`) creates `ResearchDocument` records without setting `sourceType`. The Prisma schema defaults it to `"WEB"`. The frontend categorizes: `ACADEMIC` → Papers, `WEB` → Web, **everything else** → Uploaded. Since uploads default to `WEB`, they show in the Web tab.

---

## ✅ Definition of Done

- [ ] Upload API sets `sourceType: 'USER_UPLOAD'` for file uploads
- [ ] Schema comment updated to document new value
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: uploaded PDF shows in "Uploaded" tab

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/app/api/documents/upload/route.ts` | Add sourceType field |
| `prisma/schema.prisma` | Update comment |

## 🚫 Constraints

- ONLY modify the two files listed
- No migration needed
- Run `npx tsc --noEmit` after changes
