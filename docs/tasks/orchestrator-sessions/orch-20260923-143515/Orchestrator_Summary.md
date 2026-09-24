# Margin rebrand handoff

Session `orch-20260923-143515` followed Genesis audit, UI design, public build, student build and one focused review. The approved A/Margin direction now covers the landing page, auth, signed-in shell, dashboard, profile, builder and active desktop/mobile writing workspace. The customer-facing name is J-Star Projects. The palette, typography, chapter margin, PWA icon, Open Graph image and visible metadata match. Existing project, price, payment, save and research logic was preserved.

Read [`docs/walkthroughs/margin_rebrand.md`](../../../walkthroughs/margin_rebrand.md) for screenshots, inspection steps and limitations. [`docs/features/Margin_Rebrand.md`](../../../features/Margin_Rebrand.md) holds the visual rules. The original comparison remains in [`docs/mockups/rebrand-directions.html`](../../../mockups/rebrand-directions.html).

`pnpm exec tsc --noEmit --incremental false`, `pnpm exec next build` and `git diff --check` passed. Browser checks covered public routes at 1280/375px and a 320px navigation check. Pricing switch, concept dialog and mobile menu worked. Authenticated project editing, payment and save were not browser-tested without a safe test project. Broad lint still reports inherited errors in unchanged editor/research lines; focused public/core lint passes. No deployment or database write occurred.

Consultation variants, hub/chat entry screens, services, admin/partner and email templates need a separate UI sweep for a product-wide rollout. `src/lib/auth.ts` already had unrelated edits; its old FYB email subject was deliberately left untouched.
