# AI model routing

## Goal
Use OpenRouter's `openai/gpt-6-luna` for app inference at task-appropriate reasoning effort. Keep native Google APIs for Google Search and File Search grounding, which OpenRouter cannot run against the app's Google file stores.

## Components
- Client: Jay's retry in `src/features/bot/hooks/useChatFlow.tsx` retries the same model, not a different provider.
- Server: `src/lib/ai/models.ts` contains model IDs and reasoning settings; `src/lib/ai/router.ts` chooses GPT-6 Luna for ordinary inference or Gemini 2.5 Flash for native grounding.
- Direct OpenRouter calls in API routes and services use the same router. Monji's `ToolLoopAgent` applies the same reasoning settings.

## Data flow
1. Jay, Nengi, topic extraction, research snippets and search queries use low or medium reasoning.
2. Outlines, abstracts, chapter enhancement, document metadata and Mermaid generation use medium reasoning. Monji's tool-using assistant and ungrounded chapter/section writing use high reasoning.
3. Uploaded files continue to sync to Google File Search. Search over those stores, grounded chapter generation and Google Search grounding continue to call Gemini natively.
4. `OPENROUTER_API_KEY` is required for GPT-6 Luna. `GEMINI_API_KEY` is required for native grounding. GPT-6 Luna is paid; there is no free-tier or Groq fallback.

## Database schema
Unchanged. Existing research file stores remain on Google. New document metadata is labelled with the model that generated it; previously stored metadata is not rewritten.
