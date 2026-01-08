# Feature: Project-Aware AI Assistant (The Copilot)

**Status:** Implemented (Phase 1-3)
**Last Updated:** 2025-12-28

## Goal
To provide paid users with a context-aware AI assistant that knows their specific project details (Topic, Abstract, Key Chapters) and can assist with writing, refining, and answering academic questions.

## Components

### 1. Database Schema
New models added to `prisma/schema.prisma`:
- **`ProjectConversation`**: Links a conversation to a `Project`.
- **`ProjectChatMessage`**: Stores the actual messages (`user` | `assistant`).

### 2. API Route (`/app/api/projects/[id]/chat/route.ts`)
- **Method:** `POST`
- **Uses:** `streamText` (Vercel AI SDK), `Groq` (Llama-3.3-70b).
- **Functionality:** 
    - Fetches Project context (Topic, Twist, Abstract, Outline).
    - Injects context into System Prompt.
    - Streams response to client.
    - Saves conversation history to Database.

### 3. Frontend Component (`AcademicCopilot.tsx`)
- **Location:** `src/features/builder/components/v2/AcademicCopilot.tsx`
- **Uses:** `useChat` hook from `@ai-sdk/react` with `DefaultChatTransport` (AI SDK v6).
- **UI:** 
    - Sidebar panel in the project workspace.
    - Shows typing indicators.
    - Persists chat history via threaded conversations.

### 4. Integration
- Integrated into `ChapterOutliner.tsx` (The Builder Dashboard).
- Visible only after `isPaid` check passes.

## Data Flow
1. User types message in `ProjectAssistant`.
2. `useChat` sends POST to `/api/projects/[id]/chat` with message history.
3. Server hydrates context from DB (`Project` + `Outline`).
4. LLM generates response (Streamed).
5. Server saves user message and final AI response to `ProjectChatMessage`.
6. Client updates UI in real-time.

## Future Improvements (Phase 4+)
- **RAG Support**: Indexing uploaded PDF research documents.
- **Context Management**: "New Chat" button and switching between historical conversations.
- **Message Truncation**: Better handling of long context windows.
