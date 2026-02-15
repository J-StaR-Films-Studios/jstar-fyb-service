# Task: Integration Testing

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 8 - Verification & Testing  
**Priority:** P0  
**Dependencies:** 17_typescript_verification.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Perform integration testing to verify the refactored Monji chat system works end-to-end. This includes testing the agentic loop, tool execution, streaming, and frontend rendering.

---

## 🎯 Scope

**In Scope:**
- Test chat API endpoint functionality
- Test multi-step tool execution (agentic loop)
- Test streaming responses
- Test tool result rendering in frontend
- Test thinking vs non-thinking model behavior
- Test thread management
- Test message persistence

**Out of Scope:**
- Unit tests for individual functions
- Performance testing
- Load testing

---

## 📚 Context

### Test Scenarios

| Scenario | Description | Expected Behavior |
|----------|-------------|-------------------|
| Simple chat | User sends "Hello" | Model responds, no tool calls |
| Search documents | User asks to search research | `searchProjectDocuments` called, results shown |
| Suggest edit | User asks to revise text | `suggestEdit` called, suggestion card shown |
| Generate diagram | User asks for diagram | `generateDiagram` called, diagram preview shown |
| Generate section | User asks to write content | `generateSection` called, content saved |
| Multi-step | User asks for full chapter | Multiple tools called in sequence |
| Thread switching | User switches threads | Messages load correctly |

---

## 🔧 Testing Checklist

### A. API Route Tests

#### A1. Basic Chat (No Tools)
```bash
curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, what can you help me with?"}],
    "threadId": null
  }'
```
**Expected:** Streaming response, new thread created, messages saved

#### A2. Tool Execution
```bash
curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "List my chapters"}],
    "threadId": null
  }'
```
**Expected:** `listChapters` tool called, chapter list returned

#### A3. Multi-Step Execution
```bash
curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Generate an outline and write the first section of chapter 1"}],
    "threadId": null
  }'
```
**Expected:** 
1. `generateChapterOutline` called
2. `generateSection` called
3. Multiple steps executed (up to 10)

### B. Frontend Tests (Manual)

#### B1. Message Rendering
1. Open project workspace
2. Send a message
3. Verify message appears in chat
4. Verify typing indicator shows during generation
5. Verify response streams in

#### B2. Tool Result Rendering
1. Ask "What chapters do I have?"
2. Verify tool result card renders
3. Verify content is readable

#### B3. Edit Suggestion Flow
1. Ask "Revise the first paragraph of chapter 1"
2. Verify `suggestEdit` tool is called
3. Verify edit suggestion card appears
4. Click "Apply" - verify edit is applied
5. Click "Reject" - verify suggestion dismissed

#### B4. Diagram Flow
1. Ask "Create a flowchart of my research methodology"
2. Verify `generateDiagram` tool is called
3. Verify diagram preview appears
4. Click "Insert" - verify diagram inserted
5. Click "Save" - verify diagram saved to library

#### B5. Thread Management
1. Create a new thread
2. Send messages in thread
3. Switch to another thread
4. Verify messages load correctly
5. Return to first thread
6. Verify conversation preserved

### C. Edge Cases

#### C1. Error Handling
1. Test with invalid project ID
2. Test with non-existent thread ID
3. Test with malformed message format
**Expected:** Graceful error responses, no crashes

#### C2. Long-Running Operations
1. Request generation of large content
2. Verify streaming continues
3. Verify timeout handling (if applicable)

#### C3. Concurrent Requests
1. Send multiple messages quickly
2. Verify mutex works for `generateSection`
3. Verify no race conditions

---

## ✅ Definition of Done

- [ ] All API route tests pass
- [ ] All frontend manual tests pass
- [ ] Edge cases handled gracefully
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Streaming works correctly
- [ ] Tool execution loop works (up to 10 steps)
- [ ] Message persistence verified
- [ ] Thread switching works

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `completed/18_integration_testing.result.md` | Test results and any issues found |

---

## 🚫 Constraints

- Do not test against production data
- Use a test project if available
- Document any failures with screenshots/logs

---

## 📝 Result Documentation Format

```markdown
# Integration Test Results

**Date:** YYYY-MM-DD
**Tester:** [Name/AI]

## API Route Tests

| Test | Status | Notes |
|------|--------|-------|
| A1. Basic Chat | ✅/❌ | ... |
| A2. Tool Execution | ✅/❌ | ... |
| A3. Multi-Step | ✅/❌ | ... |

## Frontend Tests

| Test | Status | Notes |
|------|--------|-------|
| B1. Message Rendering | ✅/❌ | ... |
| B2. Tool Result | ✅/❌ | ... |
| B3. Edit Suggestion | ✅/❌ | ... |
| B4. Diagram Flow | ✅/❌ | ... |
| B5. Thread Management | ✅/❌ | ... |

## Edge Cases

| Test | Status | Notes |
|------|--------|-------|
| C1. Error Handling | ✅/❌ | ... |
| C2. Long-Running | ✅/❌ | ... |
| C3. Concurrent | ✅/❌ | ... |

## Issues Found

1. [Description of issue]
   - Severity: High/Medium/Low
   - Suggested fix: ...

## Recommendations

- [Any improvements or follow-up tasks]
```

---

*Generated by vibe-orchestrator mode*
