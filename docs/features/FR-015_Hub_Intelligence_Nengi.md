# FR-015: Hub Intelligence (Nengi)

## Overview
The Hub Intelligence feature provides users with a universal "Brain Dump" and creative partner named **Nengi**. Unlike Jay (Sales) or Monji (Academic Writing), Nengi is a generalist designed for brainstorming, emotional support, and connecting ideas across multiple user projects. Users with at least one active project are automatically routed to Nengi in the Hub.

## Architecture
- **Page:** `src/app/(saas)/hub/page.tsx`
- **Interface:** `src/features/bot/components/HubChatInterface.tsx`
- **Switcher:** `src/features/bot/components/BotSwitcher.tsx`
- **API Route:** `src/app/api/hub/chat/route.ts`
- **System Prompt:** `src/features/bot/prompts/system.ts` (`NENGI_SYSTEM_PROMPT`)
- **Dependencies:** `@ai-sdk/react`, `framer-motion`, `lucide-react`

## Key Components

### HubChatInterface
The primary UI for interacting with Nengi. It uses a specialized implementation of the Vercel AI SDK `useChat` hook to maintain compatibility with version 5.0.

### Nengi Personality
- **Voice:** Chill, observant, relaxed.
- **Goal:** Brainstorming, venting, cross-project context.
- **Routing Logic:** Highly observant friend who connects dots across all projects a user owns.

## SDK Implementation (AI SDK 5.0)
Due to breaking changes in AI SDK 5.0, the `HubChatInterface` implements specific patterns:

- **Transport:** Uses `DefaultChatTransport` to explicitly define the `/api/hub/chat` endpoint.
- **Input State:** Manages `inputValue` locally as the hook no longer provides built-in input helpers in the same way.
- **Initial Greeting:** Uses `useEffect` + `setMessages` to trigger the "welcome" message, as `initialMessages` is not supported in the options object.
- **Parts Parsing:** Maps through `m.parts` to extract text content from AI responses.

## Data Flow
```mermaid
flowchart LR
    User --> HubChatInterface[Hub Chat Interface]
    HubChatInterface --> API[/api/hub/chat]
    API --> NengiPrompt[Nengi System Prompt]
    NengiPrompt --> AIModel[AI Model]
    AIModel --> API
    API --> HubChatInterface
```

## Hotfixes / Changelog

- **Problem:** `HubChatInterface` was using outdated `useChat` properties (`api`, `initialMessages`, `input`) resulting in build errors.
- **Solution:** Refactored the component to use `DefaultChatTransport`, local state, and `setMessages` for the initial greeting. Added `parts` parsing for message rendering.

### 2026-01-05: Mobile Immersive Mode
- **Feature:** Implemented "Immersive Mode" for Hub Chat on mobile.
- **Behavior:** Hides the application's `MobileBottomNav` when in the Hub view to maximize vertical screen real estate for the keyboard and chat timeline.

### 2026-01-05: Crew Switcher (BotSwitcher)
- **Feature:** Introduced `BotSwitcher.tsx`, a dropdown component in the header allowing users to switch between AI personas (Nengi, Jay, Monji).
- **Behavior:** Monji option links to the user's latest project workspace (`/project/[id]/workspace`). If no project exists, it falls back to `/dashboard`.
- **Routing Change:** Removed forced redirect from `/chat` to `/hub`. Users can now access Jay anytime via the switcher.
- **Files Changed:** `BotSwitcher.tsx`, `hub/page.tsx`, `chat/page.tsx`, `SaasShell.tsx`.
