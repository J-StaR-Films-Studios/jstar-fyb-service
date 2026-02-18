# Task: Add Input Validation for Messages Array

**Session ID:** org-20250216-academic-agent-hardening  
**Source:** Orchestrator  
**Context:** Master Plan Phase 2 - Robustness  
**Priority:** P1 (MEDIUM)  
**Dependencies:** 01_add_auth_check.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Add input validation to the chat API route to ensure the request body is properly formatted before processing.

---

## 🎯 Scope

**In Scope:**
- Validate request body structure
- Validate messages array format
- Validate message content types
- Return 400 Bad Request for invalid input
- Provide clear error messages for debugging

**Out of Scope:**
- Content moderation
- Message size limits (can be added later)
- Rate limiting

---

## 📚 Context

### Current Issue

The chat API route does not validate the incoming request body. Malformed requests could cause unexpected behavior or errors.

### Expected Request Format

```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{ type: string; text?: string }>;
    parts?: Array<{ type: string; text?: string }>;
  }>;
  threadId?: string | null;
  contextScope?: {
    chapterNumbers?: number[];
    includeResearch?: boolean;
  };
}
```

---

## 🔧 Implementation

### Step 1: Create Validation Utility

```typescript
// src/lib/validation/chat.ts
import { z } from 'zod';

const MessageContentSchema = z.union([
  z.string().min(1, 'Message content cannot be empty'),
  z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    })
  ).min(1, 'Message parts cannot be empty'),
]);

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: MessageContentSchema.optional(),
  parts: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    })
  ).optional(),
}).refine(
  (data) => data.content || data.parts,
  { message: 'Message must have either content or parts' }
);

const ContextScopeSchema = z.object({
  chapterNumbers: z.array(z.number().int().positive()).optional(),
  includeResearch: z.boolean().optional(),
}).optional();

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1, 'At least one message is required'),
  threadId: z.string().nullable().optional(),
  contextScope: ContextScopeSchema,
});

export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;

export function validateChatRequest(body: unknown): 
  | { success: true; data: ValidatedChatRequest }
  | { success: false; error: string } {
  try {
    const data = ChatRequestSchema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join('; ') };
    }
    return { success: false, error: 'Invalid request format' };
  }
}
```

### Step 2: Apply Validation in Route

```typescript
// In route.ts POST handler, after auth checks:

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ... auth checks ...

  // --------------------------------------------------------
  // 1. VALIDATE REQUEST BODY
  // --------------------------------------------------------
  
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const validation = validateChatRequest(body);
  
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { messages, threadId, contextScope } = validation.data;
  
  // Continue with existing logic...
}
```

---

## ✅ Definition of Done

- [ ] Validation utility created
- [ ] Zod schemas defined for all request fields
- [ ] Validation applied to POST handler
- [ ] 400 returned for invalid JSON
- [ ] 400 returned for validation failures
- [ ] Error messages are descriptive
- [ ] TypeScript compiles without errors
- [ ] Existing valid requests still work

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/validation/chat.ts` | Validation schemas and utilities |
| `src/app/api/projects/[id]/chat/route.ts` | Updated with validation |

---

## 🚫 Constraints

- Use Zod for schema validation (already in project)
- Don't reject valid requests
- Keep error messages helpful but not exposing internals

---

## ⚠️ Testing

After implementation, verify:

1. **Empty Messages Array:**
   ```bash
   curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
     -H "Content-Type: application/json" \
     -H "Cookie: session=..." \
     -d '{"messages": []}'
   # Expected: 400 Bad Request, "At least one message is required"
   ```

2. **Invalid Role:**
   ```bash
   curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
     -H "Content-Type: application/json" \
     -H "Cookie: session=..." \
     -d '{"messages": [{"role": "invalid", "content": "test"}]}'
   # Expected: 400 Bad Request
   ```

3. **Valid Request:**
   ```bash
   curl -X POST http://localhost:3000/api/projects/{projectId}/chat \
     -H "Content-Type: application/json" \
     -H "Cookie: session=..." \
     -d '{"messages": [{"role": "user", "content": "Hello"}]}'
   # Expected: Normal response
   ```

---

*Generated by vibe-orchestrator mode*
