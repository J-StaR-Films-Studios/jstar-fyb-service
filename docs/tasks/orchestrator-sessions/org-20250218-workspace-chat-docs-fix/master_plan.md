# Master Plan: Workspace Chat & Documents Bug Fix

**Session ID:** org-20250218-workspace-chat-docs-fix
**Created:** 2026-02-18T22:57:00+01:00
**Status:** In Progress

## Overview

Three critical bugs in the project workspace (`/project/[id]/workspace`):
1. **Blank chat bubbles on refresh** — Monji chat history loads empty content
2. **Follow-up errors after tool calls** — Agent loop works, but next message breaks
3. **Uploaded docs in wrong tab** — User uploads show in "Web" tab, not "Uploaded"

## Tasks

| # | Task File | Status | Description |
|---|-----------|--------|-------------|
| 1 | 01_fix_chat_persistence.task.md | Complete | Fix blank messages on refresh + follow-up errors |
| 2 | 02_fix_document_source_type.task.md | Complete | Fix uploaded docs appearing in wrong tab |

## Progress

- [x] Phase 1: Root Cause Analysis
- [x] Phase 2: Fix Chat Persistence & Follow-ups (Task 01)
- [x] Phase 3: Fix Document Source Type (Task 02)
- [x] Phase 4: Verification

## Root Cause Analysis

### Bug 1: Blank Message Bubbles on Refresh
**Files:** `route.ts` (GET handler), `AcademicCopilot.tsx`, `AcademicMessageBubble.tsx`

The `onFinish` callback saves `event.text` as the assistant message content. For tool-heavy agent responses (ToolLoopAgent with multiple steps), `event.text` can be empty — the LLM text is distributed across steps. When the GET handler loads messages back, it creates `{ type: 'text', text: m.content }` parts, but `m.content` is empty → blank bubbles.

**Fix:** Aggregate text from ALL agent steps in `onFinish`, not just `event.text`.

### Bug 2: Follow-up Questions Breaking After Tool Calls
**Files:** `route.ts` (POST handler, lines 98-139), `AcademicCopilot.tsx`

When DB-loaded messages (with `tool-{toolName}` parts) are sent back to the API for follow-up, the parts filter/transformer at lines 100-128 may produce malformed message objects that fail AI SDK v6 validation. The part types from DB don't match what the SDK expects in round-trip.

**Fix:** Improve the message sanitization to properly handle round-tripped tool parts, and ensure the `content` field isn't stripped when it should be preserved.

### Bug 3: Uploaded Documents Not in "Uploaded" Tab
**Files:** `upload/route.ts`, `DocumentUpload.tsx`

The upload API creates `ResearchDocument` records without setting `sourceType`. The schema defaults to `"WEB"`. The frontend categorizes docs by `sourceType`: `ACADEMIC` → Papers, `WEB` → Web, everything else → Uploaded. Since uploads default to `WEB`, they show in Web tab.

**Fix:** Set `sourceType: 'USER_UPLOAD'` in the upload API when creating documents.

## Notes

- Tasks 01 and 02 are independent and can be worked on in parallel
- Task 01 is higher priority (chat is broken)
