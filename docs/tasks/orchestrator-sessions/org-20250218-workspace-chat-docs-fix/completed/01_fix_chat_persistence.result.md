# Task Result: Fix Chat Persistence & Follow-up Errors

**Session ID:** org-20250218-workspace-chat-docs-fix
**Completed At:** 2026-02-18
**Status:** Complete

---

## Summary

Fixed two related bugs in the chat API route (`/api/projects/[id]/chat`):

1. **Blank message bubbles on refresh** — Fixed by aggregating text from ALL agent steps in `onFinish`, not just `event.text`
2. **Follow-up messages failing after tool calls** — Fixed by simplifying message sanitization to strip all tool parts and keep only text

---

## Changes Made

### File: `src/app/api/projects/[id]/chat/route.ts`

**Fix 1: Aggregate text from all steps (lines 300-315)**
- Added logic to iterate through all `event.steps` and collect text from `text` type parts
- Falls back to `event.text` if available, otherwise aggregates from steps

**Fix 2: Simplified message sanitization (lines 97-120)**
- Replaced complex tool-part transformation with simple text extraction
- Strips all tool parts from history messages — AI doesn't need old tool results
- Only keeps `text` type parts to avoid round-trip validation errors

---

## Verification

- [x] `npx tsc --noEmit` passes
- [x] Code follows project conventions
- [x] No new dependencies added

---

## Manual Testing Required

User should verify:
1. Chat history persists correctly after page refresh
2. Follow-up messages work after tool call responses
