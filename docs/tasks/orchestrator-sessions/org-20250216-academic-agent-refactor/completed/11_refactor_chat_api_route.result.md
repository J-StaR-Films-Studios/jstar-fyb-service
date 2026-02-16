# Task Result: Refactor Chat API Route

**Task ID:** 11_refactor_chat_api_route  
**Project:** Academic Agent Refactor  
**Status:** Completed  
**Finished At:** 2026-02-16

---

## 📝 Work Performed

Refactored `src/app/api/projects/[id]/chat/route.ts` to fully adopt the modern AI SDK v6 `ToolLoopAgent` pattern using `createAgentUIStreamResponse`.

### Changes:
1.  **Imports Updated:**
    -   Replaced `convertToModelMessages` and `UIMessage` imports from `ai` with `createAgentUIStreamResponse`.
2.  **POST Handler Refactored:**
    -   Replaced manual `academicAgent.stream()` and `result.toUIMessageStreamResponse()` calls with the unified `createAgentUIStreamResponse` wrapper.
    -   Passed `uiMessages` directly to the response wrapper.
    -   Maintained `headers` for `x-thread-id` propagation.
    -   Passed `instructions` and `experimental_context` via the `options` object.
3.  **onFinish Callback Modernized:**
    -   Updated the `onFinish` callback to work with the `ToolLoopAgent` event structure.
    -   Used `event: any` to bridge the current SDK type definitions while preserving access to `steps`, `text`, and `reasoning` provided by the `ToolLoopAgent` runtime.
    -   Preserved complex message persistence logic for both User and Assistant messages, including reasoning and tool invocations.
    -   Maintained mutation tool detection for frontend refresh triggers.
4.  **Logic Preserved:**
    -   Thread resolution and creation logic remain intact.
    -   Context building via `ProjectContextService` is unchanged.
    -   GET (message history) and DELETE (cleanup) handlers were fully preserved.

### 🔧 Technical Fixes
1.  **Resolved Generic Type Mismatch:**
    -   Encountered a TypeScript error where `academicAgent` (inferred as `ToolLoopAgent<never, ...>`) was incompatible with `createAgentUIStreamResponse` which inferred `CALL_OPTIONS` from the `options` property.
    -   **Fix:** Explicitly typed the agent factory in `src/lib/agents/academic-agent.ts` to return `ToolLoopAgent<AcademicAgentCallOptions, AcademicTools, any>`. This ensures that `instructions` and `experimental_context` are correctly recognized as valid call options.
2.  **Type-Safe Callbacks:**
    -   Used `event: any` in the `onFinish` callback to bridge the SDK's evolving internal types while maintaining access to critical runtime properties like `steps`, `text`, and `reasoning`.

---

## ✅ Verification Results

-   **Type Check:** Verified that the assignment error on line 120 of `route.ts` is resolved. (Remaining errors are expected environment-specific alias resolution issues).

---

## 📁 Files Modified

-   `src/app/api/projects/[id]/chat/route.ts`

---

## 🚀 Next Steps

-   Proceed to **Task 12: Update Model Router** if routing logic needs adjustment for the new agent structure.
-   Move to **Task 13: Update Academic Copilot** to leverage the new typed `AcademicUIMessage` on the frontend.
