# Task: Add Runtime Type Checks for Context Casting

**Session ID:** org-20250216-academic-agent-hardening  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Type Safety  
**Priority:** P2 (LOW)  
**Dependencies:** 02_add_input_validation.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Add runtime type guards and validation for the `ToolExecutionContext` that is passed to tools via `experimental_context`. This ensures tools receive properly typed context and fail gracefully if context is malformed.

---

## 🎯 Scope

**In Scope:**
- Create type guard for `ToolExecutionContext`
- Add runtime validation in tool execute functions
- Provide clear error messages for missing context
- Log warnings for unexpected context shapes

**Out of Scope:**
- Changes to context structure
- Changes to tool logic
- Frontend changes

---

## 📚 Context

### Current Issue

Tools cast the context parameter without validation:

```typescript
// Current pattern (unsafe)
execute: async ({ param1 }, context) => {
  const { projectId } = context as ToolExecutionContext;
  // If context is wrong type, this fails at runtime
}
```

### Expected Pattern

```typescript
// Safer pattern
execute: async ({ param1 }, context) => {
  const result = validateToolContext(context);
  if (!result.success) {
    return toolError('Context validation failed: ' + result.error);
  }
  const { projectId } = result.data;
  // Now we have validated context
}
```

---

## 🔧 Implementation

### Step 1: Create Context Validation Utility

```typescript
// src/lib/tools/context-validation.ts
import type { ToolExecutionContext } from './types';

interface ContextValidationResult {
  success: true;
  data: ToolExecutionContext;
}

interface ContextValidationError {
  success: false;
  error: string;
}

/**
 * Validates that the provided context matches ToolExecutionContext.
 * Returns the validated context or an error message.
 */
export function validateToolContext(
  context: unknown
): ContextValidationResult | ContextValidationError {
  if (!context || typeof context !== 'object') {
    return { success: false, error: 'Context is not an object' };
  }

  const ctx = context as Record<string, unknown>;

  // Required fields
  if (typeof ctx.projectId !== 'string' || !ctx.projectId) {
    return { success: false, error: 'projectId is required and must be a non-empty string' };
  }

  if (ctx.conversationId !== null && typeof ctx.conversationId !== 'string') {
    return { success: false, error: 'conversationId must be a string or null' };
  }

  if (typeof ctx.chaptersText !== 'string') {
    return { success: false, error: 'chaptersText is required and must be a string' };
  }

  // Optional fields
  if (ctx.activeChapterNumber !== undefined && typeof ctx.activeChapterNumber !== 'number') {
    return { success: false, error: 'activeChapterNumber must be a number if provided' };
  }

  if (ctx.userId !== undefined && typeof ctx.userId !== 'string') {
    return { success: false, error: 'userId must be a string if provided' };
  }

  return {
    success: true,
    data: {
      projectId: ctx.projectId,
      conversationId: ctx.conversationId as string | null,
      chaptersText: ctx.chaptersText as string,
      activeChapterNumber: ctx.activeChapterNumber as number | undefined,
      userId: ctx.userId as string | undefined,
    },
  };
}

/**
 * Type guard for ToolExecutionContext.
 * Use when you want a boolean check without error details.
 */
export function isValidToolContext(context: unknown): context is ToolExecutionContext {
  return validateToolContext(context).success;
}

/**
 * Helper to get validated context or throw.
 * Use when context is guaranteed to be valid (e.g., after API route construction).
 */
export function getValidatedContext(context: unknown): ToolExecutionContext {
  const result = validateToolContext(context);
  if (!result.success) {
    throw new Error(`Invalid tool context: ${result.error}`);
  }
  return result.data;
}
```

### Step 2: Update Tool Execute Functions

Update each tool to use the validation:

```typescript
// Example: src/lib/tools/search-documents.ts
import { validateToolContext, toolError, toolSuccess } from './context-validation';

export const searchProjectDocumentsTool = tool({
  description: 'Search project documents...',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }, context) => {
    // Validate context first
    const ctxResult = validateToolContext(context);
    if (!ctxResult.success) {
      console.error('[searchProjectDocuments] Context validation failed:', ctxResult.error);
      return toolError(`Context error: ${ctxResult.error}`);
    }
    
    const { projectId } = ctxResult.data;
    
    // Continue with tool logic...
  },
});
```

### Step 3: Create Helper Wrapper (Optional)

For tools that always need context, create a wrapper:

```typescript
// src/lib/tools/with-context.ts
import { validateToolContext, ToolResult, toolError } from './types';
import type { ToolExecutionContext } from './types';

type ToolExecuteFn<TInput, TOutput> = (
  input: TInput,
  context: ToolExecutionContext
) => Promise<ToolResult<TOutput>>;

/**
 * Wraps a tool execute function with context validation.
 */
export function withValidatedContext<TInput, TOutput>(
  fn: ToolExecuteFn<TInput, TOutput>
): (input: TInput, context: unknown) => Promise<ToolResult<TOutput>> {
  return async (input: TInput, context: unknown) => {
    const result = validateToolContext(context);
    if (!result.success) {
      console.error('[Tool] Context validation failed:', result.error);
      return toolError(`Context validation failed: ${result.error}`);
    }
    return fn(input, result.data);
  };
}

// Usage:
export const myTool = tool({
  description: '...',
  inputSchema: z.object({ ... }),
  execute: withValidatedContext(async ({ param }, context) => {
    // context is now validated and typed
    const { projectId } = context;
    return toolSuccess({ ... });
  }),
});
```

---

## ✅ Definition of Done

- [ ] Context validation utility created
- [ ] Type guard function created
- [ ] All tools updated to use validation
- [ ] Clear error messages for invalid context
- [ ] TypeScript compiles without errors
- [ ] Existing functionality preserved

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/context-validation.ts` | Validation utilities |
| `src/lib/tools/*.ts` | Updated tools with validation |

---

## 🚫 Constraints

- Don't change the context structure
- Don't break existing tool behavior
- Keep error messages helpful for debugging

---

## ⚠️ Testing

After implementation, verify:

1. **Missing Context:**
   - Tool called with `null` context
   - Expected: Tool returns error, doesn't crash

2. **Invalid Context:**
   - Tool called with `{ wrongField: "value" }`
   - Expected: Tool returns error with clear message

3. **Valid Context:**
   - Tool called with proper context
   - Expected: Tool executes normally

---

*Generated by vibe-orchestrator mode*
