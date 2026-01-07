# TECH-001: Chat Routing Architecture

## Overview
J Star FYB Service employs a **Multi-Bot Architecture**, where different AI personalities ("Bots") serve distinct purposes and are routed to separate API endpoints. This ensures separation of concerns (Sales vs. Research vs. Creative) and correct context injection.

## Bot Crew & Routing

| Bot Name | Role | Route | Context Source | System Prompt |
|----------|------|-------|----------------|---------------|
| **Jay** | Sales & Onboarding | `/api/chat` | Session / Anonymous | `CORE_IDENTITY` |
| **Monji** | Academic Copilot | `/api/projects/[id]/chat` | Project DB (Chapters, Research) | `MONJI_SYSTEM_PROMPT` |
| **Nengi** | Creative Hub | `/api/hub/chat` | User Dashboard / All Projects | `NENGI_SYSTEM_PROMPT` |

## Implementation Patterns

### 1. Client-Side Routing (`useChat`)
We use the Vercel AI SDK v5. Due to specific version behavior in our `package.json`, we must use `DefaultChatTransport` to explicitly set the API endpoint.

**Crucial Implementation Detail:**
For custom routes (Monji, Nengi), you **cannot** rely on the default `api` prop of `useChat` (which often defaults to `/api/chat`). You must use the `transport` configuration.

```typescript
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
        api: `/api/projects/${projectId}/chat`, // Explicit route
    }),
    id: `academic-copilot-${projectId}`,
    // ...
});
```

### 2. Runtime Patterns (`append` vs `sendMessage`)
We utilize the `append` method from `useChat` to send messages with custom request bodies (context).

**Pattern:**
```typescript
const { append } = useChat({ ... });

// Wrapper to inject body options
const sendMessage = async (text: string) => {
    await append({
        role: 'user',
        content: text
    }, {
        body: { threadId: activeThreadId } // Context injection
    });
};
```

### 3. Context Injection & Thread Sync
For **Monji** (Academic Copilot), context is critical.
- **Request:** The UI passes `activeThreadId` in the request body.
- **Response:** The server returns the canonical `x-thread-id` header.
- **Sync:** The client listens to `onResponse` to update the `activeThreadId` if the server redirects or creates a new thread.

```typescript
onResponse: (response) => {
    const threadId = response.headers.get('x-thread-id');
    if (threadId) setActiveThreadId(threadId);
}
```

The API route (`src/app/api/projects/[id]/chat/route.ts`) reads these body parameters to build a prompt grounded in the specific project data.

## Server-Side Handling
Each route handler follows a similar pattern but uses different services:
1.  **Jay**: Uses `Groq` provider directly, with stateless memory (or client-side history).
2.  **Monji**: Uses `Google Generative AI` (Gemini) + `ProjectContextService` to fetch DB content.
3.  **Nengi**: Uses `Groq` + `HubService` to fetch user's project summaries.

## Troubleshooting
- **404 Not Found**: Check if `projectId` is undefined in the URL construction.
- **"Detailed Context Missing"**: Ensure `activeThreadIdRef` is syncing correctly in `AcademicCopilot.tsx`.
- **"Wrong Bot Responding"**: You are likely hitting `/api/chat` by default. Check `transport` config.
