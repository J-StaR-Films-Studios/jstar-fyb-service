# FR-002: AI Sales Consultant (Jay)

## Goal
An AI-powered chat interface where students find a project topic through guided conversation with "Jay" - the Lead Project Architect. Jay acts as a sales consultant who critiques boring ideas, suggests impressive "J Star Twists", and guides users toward purchasing J Star Dev Packages.

## Status: ✅ Implemented

---

## Component Breakdown

### Server Components
| File | Purpose |
|------|---------|
| `src/app/(saas)/chat/page.tsx` | Route wrapper, renders ChatInterface |
| `src/app/api/chat/route.ts` | **Stateless** Groq AI endpoint (Inference Only) |
| `src/features/bot/actions/chat.ts` | Server actions for conversation persistence (called from client) |

### Client Components (`'use client'`)
| File | Purpose |
|------|---------|
| `src/features/bot/components/ChatInterface.tsx` | Main container, handles scroll, input, messages |
| `src/features/bot/components/MessageBubble.tsx` | Styled bubbles with markdown rendering (react-markdown) |
| `src/features/bot/components/ComplexityMeter.tsx` | Visual 1-5 difficulty meter (AI-controlled) |
| `src/features/bot/components/SuggestionChips.tsx` | Action buttons: Accept/Simplify/Harder + "Proceed to Builder" |
| `src/features/bot/hooks/useChatFlow.tsx` | State machine, persistence orchestration, tool detection |

---

## Logic & Data Flow

### Chat Persistence Architecture (Client-First)
We use a **Client-First, Optimistic Persistence** model (aka "JohnGPT" architecture) to ensure reliability and handle auth states correctly.

1.  **Stateless API**: `/api/chat` only streams the AI response. It does *not* write to the DB.
2.  **Client Orchestration**: `useChatFlow` listens for the `onFinish` event from the AI SDK.
3.  **Optimistic Save**: When streaming finishes, the client calls the `saveConversation` Server Action.
4.  **Data Integrity**:
    - **CUID Support**: Handles CUIDs (BetterAuth standard) for `userId` and `conversationId`.
    - **Role Mapping**: Maps `ai` roles to `assistant` for Prisma compatibility.
    - **Content Extraction**: Extracts text from `parts` array (AI SDK v3+) to prevent saving empty messages.

### AI Provider Setup
```typescript
// Groq via OpenAI-compatible SDK
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});
// Model: openai/gpt-oss-120b via Groq
```

### System Prompt (Jay's Persona)
- **Tone:** Senior Dev talking to junior student. Nigerian tech slang ("Omo", "No wahala").
- **Style:** Short, punchy, markdown-heavy. Never writes essays.
- **Mission:** Critique boring ideas, suggest J Star Twists, sell dev packages.
- **Pricing Reference:** Basic ₦120k, Standard ₦200k, Premium ₦320k.

### AI Tools (Function Calling)
| Tool | Description | Returns |
|------|-------------|---------|
| `suggestTopics` | Suggests 3 project topics with twists | `{ topics: [{ title, twist, difficulty }] }` |
| `setComplexity` | Updates the complexity meter (1-5) | `{ level, reason, updated: true }` |
| `getPricing` | Returns J Star pricing tiers | `{ basic, standard, premium }` |
| `confirmTopic` | Confirms topic and triggers builder handoff | `{ topic, twist, confirmed: true }` |

### State Machine (`useChatFlow`)
```
INITIAL → ANALYZING → PROPOSAL → NEGOTIATION → CLOSING
```

### Chat → Builder Handoff

#### Flow
1. User chats with Jay → gets topic suggestion
2. **Smart Suggestion Chips** appear: "Accept Topic", "Make it Simpler", "Too Boring"
3. User clicks "Accept Topic" → AI calls `confirmTopic` tool
4. Chips switch to **"Proceed to Builder"** button (manual trigger)
5. User clicks → saves to `localStorage`, redirects to `/project/builder`
6. Builder's `useBuilderStore.hydrateFromChat()` pre-fills topic/twist

#### State Tracking
```typescript
// useChatFlow.tsx
const [confirmedTopic, setConfirmedTopic] = useState<{topic: string, twist: string} | null>(null);
```

#### Manual Proceed Function (Auth-Aware)
```typescript
const proceedToBuilder = () => {
    // If user is already authenticated, go directly to builder
    if (userId) {
        router.push('/project/builder');
    } else {
        // Otherwise, redirect to register with callback
        router.push('/auth/register?callbackUrl=/project/builder');
    }
};
```

---

## Reliability Features

### Retry Logic
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Exponential backoff: 1s, 2s, 4s
```

### Empty Message Filter
Client filters out blank AI responses to prevent gray bubbles in UI.

### Error Handling
Returns user-friendly error: "Jay is currently offline (System Overload)."

### Data Persistence Guard
- **Client-Side Trigger**: Persistence is triggered by the client, ensuring `userId` is available (if logged in).
- **Atomic Saves**: Transaction-based saving prevents partial history states.
- **Robust Deletion**: `clearAllConversations` uses an **OR** condition to wipe both User-linked and Anonymous records simultaneously, preventing "ghost history" rollbacks.
- **Bot Isolation**: Deletion is scoped by `botType` (e.g., clearing Jay doesn't wipe Nengi).

---

## Database Schema
Uses existing Prisma schema from FR-003:
- `Conversation` table stores messages as JSON
- `Lead` table captures user info

---

## Dependencies
- `ai` (Vercel AI SDK v6)
- `@ai-sdk/react` (useChat hook)
- `@ai-sdk/openai` (Groq provider)
- `react-markdown` (Message rendering)
- `zod` (Tool input validation)

---

## Implementation Checklist
- [x] Groq AI integration with streaming
- [x] Jay system prompt with Nigerian slang
- [x] Tool: suggestTopics
- [x] Tool: setComplexity (updates UI meter)
- [x] Tool: getPricing
- [x] Tool: confirmTopic (chat→builder handoff)
- [x] Retry logic with exponential backoff
- [x] Empty message filtering (fixed for `parts`)
- [x] Markdown rendering in MessageBubble
- [x] Mobile-optimized UI (no bot icon on mobile)
- [x] Client-First Persistence (JohnGPT architecture)

---

## Changelog

### 2026-01-01: Client-First Persistence Refactor
- **Architecture Change**: Moved persistence from `/api/chat` (server-side) to `useChatFlow` (client-side) to fix unreliable `userId` availability.
- **Fix**: Patched "Empty Bubble" bug by extracting text from AI SDK `parts`.
- **Fix**: Relaxed Zod validation to support CUIDs.

### 2025-12-31: UX Improvements
- Back button now uses `router.back()` to respect navigation history.
- Profile picture now uses shared `UserAvatar` component.
- `proceedToBuilder()` is now auth-aware - goes directly to builder if logged in.

### 2026-01-05: BotSwitcher & SaasShell Integration
- **Feature:** Jay's chat (`/chat`) is now wrapped in `SaasShell` for logged-in users, providing a consistent header with the `BotSwitcher`.
- **Code Change:** `ChatInterface.tsx` now accepts a `hideHeader` prop. When `true`, the internal header is hidden, and the parent (`SaasShell`) provides the header with `BotSwitcher`.
- **Routing:** Removed forced redirect from `/chat` to `/hub`. Users with projects can still access Jay via the switcher.

### 2026-01-07: Chat Deletion & Isolation Fix
- **Bug Fix**: fixed "Deletion Rollback" where anonymous history persisted after "Clear Chat" for logged-in users.
- **Logic**: `clearAllConversations` now targets `userId` OR `anonymousId`.
- **Feature**: Added `botType` scoping to deletion to prevent cross-bot data loss.
