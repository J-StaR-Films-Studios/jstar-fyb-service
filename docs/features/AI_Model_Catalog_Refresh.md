# AI Model Catalog Refresh

## Goal
Keep the app's model registry aligned with the current OpenRouter free-tier catalog so routing does not break when older model IDs disappear.

## Components
- Client: `src/lib/openrouter.ts` and any UI that selects models indirectly through the router.
- Server: `src/lib/ai/models.ts`, `src/lib/ai/router.ts`, and any API route that forces a model override.

## Data Flow
1. The curated model list in `docs/openrouter.csv` is used as the source of truth.
2. `src/lib/ai/models.ts` exposes stable aliases for each use case.
3. Provider helpers and routing logic consume those aliases instead of hard-coded IDs.
4. Requests fall back through the router when a preferred model is unavailable.

## Database Schema
None. This refresh only updates model configuration and does not change persistence.

## Notes
- Prefer live OpenRouter free models with tool support and long context when possible.
- Keep aliases stable even if the underlying provider model changes, so the rest of the app does not need churn.
