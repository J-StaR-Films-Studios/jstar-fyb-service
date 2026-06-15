# Dependency Update

## Goal
Update project dependencies with minimal regression risk, prioritizing safe patch/minor upgrades before any major migrations.

## Scope
- Use `pnpm` as the source of truth because the project docs and workspace files are pnpm-based.
- Update packages in controlled batches instead of running one broad `pnpm update --latest`.
- Verify after each meaningful batch with lint/build checks.
- Document outcomes and any packages intentionally deferred.

## Components

### Client
- Next.js App Router runtime.
- React and React DOM.
- UI/runtime packages such as Radix UI, Framer Motion, Zustand, Lucide, TipTap, PDF/document tools, and markdown/rendering libraries.

### Server
- Prisma client and CLI.
- Better Auth.
- AI SDK providers and generation utilities.
- Resend, Upstash, validation, document parsing, and API route dependencies.

## Data Flow
1. Inspect outdated dependencies with `pnpm outdated`.
2. Apply low-risk updates first:
   - patch/minor updates inside existing semver ranges
   - Next.js patch/minor with matching `eslint-config-next`
   - React patch updates
3. Run verification:
   - `pnpm lint`
   - `pnpm build`
4. Only consider major migrations after the app passes baseline verification.

## Database Schema
No schema change is planned for the safe update batch.

Major Prisma upgrades are deferred unless explicitly approved because `@prisma/client` and `prisma` are currently on `5.22.0`, while the latest available version is a major jump to `7.x`.

## Regression Watchlist
- Mixed lockfiles: the repo currently has both `pnpm-lock.yaml` and `package-lock.json`. The update should use pnpm; package-lock cleanup should be a separate explicit decision.
- Major migrations to defer initially:
  - Prisma `5.x` to `7.x`
  - Tailwind CSS `3.x` to `4.x`
  - TipTap `2.x` to `3.x`
  - TypeScript `5.x` to `6.x`
  - ESLint `9.x` to `10.x`
  - Lucide React `0.x` to `1.x`
  - React PDF renderer `3.x` to `4.x`
- `pnpm update` may write downloaded packages to pnpm's global store outside the working directory, in addition to updating repo files.

## Proposed First Batch
- Run `pnpm update` to update packages within the semver ranges already declared in `package.json`.
- Then update tightly coupled framework packages within the current major line:
  - `next`
  - `eslint-config-next`
  - `react`
  - `react-dom`
- Keep major-version migrations deferred until the safe batch is verified.

## Verification Plan
- `pnpm lint`
- `pnpm build`
- If the project turns out to include Convex files/scripts later, run `pnpm convex deploy` before handoff per project instructions. Current inspection does not show Convex in `package.json`.

## Status
- Safe update batch completed.
- Compatibility cleanup completed for React 19 / AI SDK 6 peer dependencies.
- Major migrations remain deferred.

## Update Log

### 2026-06-15
- Updated `next` from `16.1.6` to `16.2.9`.
- Updated `eslint-config-next` from `16.1.6` to `16.2.9`.
- Updated `react` and `react-dom` from `19.2.1` to `19.2.7`.
- Updated AI SDK packages within current major versions:
  - `ai`
  - `@ai-sdk/google`
  - `@ai-sdk/groq`
  - `@ai-sdk/openai`
  - `@ai-sdk/react`
- Updated common runtime dependencies within their safe current lines, including Radix UI packages, Better Auth, Resend, DOMPurify, Framer Motion, Mermaid, Zod, Zustand, document/PDF utilities, and related dev tooling.
- Upgraded `@openrouter/ai-sdk-provider` to `2.9.1` so it peers with `ai@6`.
- Upgraded `@react-pdf/renderer` to `4.5.1` and `react-pdf` to `10.4.1` for React 19 compatibility.
- Changed `tiptap-markdown` from `0.9.0` to `0.8.10` because `0.9.0` peers with TipTap 3 while the app still uses TipTap 2.
- Added explicit `@tiptap/extension-code-block@2.27.2` so `novel` resolves its TipTap 2 peer consistently after the TipTap 3 probe was reverted.
- Removed deprecated dev-only stub type packages:
  - `@types/bcryptjs`
  - `@types/cookie`
  - `@types/dompurify`
- Updated additional major-version packages that passed production build verification:
  - `@google/genai` from `1.52.0` to `2.8.0`
  - `diff` from `8.0.4` to `9.0.0`
  - `lucide-react` from `0.561.0` to `1.18.0`
  - `typescript` from `5.9.3` to `6.0.3`
  - `@types/node` from `20.19.43` to `25.9.3`
- Probed and reverted Tailwind CSS `4.3.1` because the build requires the Tailwind 4 PostCSS plugin migration.
- Probed and reverted TipTap `3.26.1` because the editor build failed on the moved `BubbleMenu` export and `novel` still expects TipTap 2 extension peers.
- Probed and reverted Prisma `7.8.0` because `prisma generate` failed on the Prisma 7 datasource/config migration requirement.

## Verification Result
- `pnpm exec prisma generate`: passed.
- `pnpm exec next build`: passed on Next.js `16.2.9`, React `19.2.7`, TypeScript `6.0.3`, and the successful additional major bumps.
- `pnpm lint`: still fails due to an existing lint backlog across scripts and app files. The errors are primarily `no-explicit-any`, unescaped JSX text, CommonJS `require()` in scripts, and React hook lint rules. This should be handled as a separate lint hardening task instead of bundled into the dependency update.

Build warnings observed:
- Both `GOOGLE_API_KEY` and `GEMINI_API_KEY` are set; the app chooses `GOOGLE_API_KEY`.
- Edge runtime disables static generation for at least one page.
- One image/style path emits invalid string values `"120"` for width/height where numeric values are expected.

## Deferred Major Migrations
- Prisma `5.22.0` to `7.x`.
- TipTap `2.x` to `3.x`.
- Tailwind CSS `3.x` to `4.x`.
- ESLint `9.x` to `10.x`.

## Remaining Notes
- The repo still contains both `pnpm-lock.yaml` and `package-lock.json`. This update used pnpm only, so `package-lock.json` was intentionally left untouched.
- `@react-email/components@1.0.12` is deprecated upstream and remains in use. Replacing it should be a separate email-rendering dependency decision.
- No Convex package or script was present in `package.json`, so `pnpm convex deploy` was not applicable for this update.
