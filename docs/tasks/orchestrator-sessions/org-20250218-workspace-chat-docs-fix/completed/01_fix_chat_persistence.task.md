# Task: Fix Chat Persistence & Follow-up Errors

**Session ID:** org-20250218-workspace-chat-docs-fix
**Source:** Orchestrator
**Context:** Monji workspace chat shows blank bubbles on refresh, and follow-up messages after tool calls throw errors
**Priority:** P0
**Dependencies:** None
**Created At:** 2026-02-18T22:57:00+01:00

---

## 📋 Objective

Fix two related bugs in the chat API route (`/api/projects/[id]/chat`):
1. Blank message bubbles on refresh (content not saved properly)
2. Follow-up messages failing after tool call responses

## 🎯 Scope

**In Scope:**
- Fixing `onFinish` text aggregation in POST handler
- Simplifying message parts sanitization in POST handler
- Both fixes in `route.ts`

**Out of Scope:**
- Frontend component changes (not needed)
- Schema changes
- New API endpoints

## 📚 Context

### Root Cause 1: Blank Messages
The `onFinish` callback saves `event.text || ''` as the content. For `ToolLoopAgent` with multi-step responses, `event.text` may be empty because text content is distributed across step content arrays. Need to aggregate text from ALL steps.

### Root Cause 2: Follow-up Errors
The message sanitization (lines 98-139) tries to filter and reformat tool parts from DB-loaded messages, but the complex transformation produces malformed objects that fail AI SDK v6 validation. Fix: strip all tool parts from history messages — only keep `text` parts. The AI doesn't need old tool results in message history.

---

## ✅ Definition of Done

- [ ] `onFinish` aggregates text from all agent steps
- [ ] Message sanitization strips tool parts, keeps only text
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: chat persists after refresh
- [ ] Manual test: follow-up after tool calls works

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/app/api/projects/[id]/chat/route.ts` | Fix onFinish + message sanitization |

## 🚫 Constraints

- ONLY modify `route.ts`
- Do NOT change frontend components
- Do NOT modify the database schema
- Run `npx tsc --noEmit` after changes
