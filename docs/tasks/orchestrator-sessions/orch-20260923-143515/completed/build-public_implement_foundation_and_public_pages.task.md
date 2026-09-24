# Task 03: Build Margin on public screens

## Agent setup
Follow `vibe-build`. Read `../master_plan.md`, `docs/features/Margin_Rebrand.md`, `docs/mockups/rebrand-directions.html` and the active marketing and auth components. The creative-web-development skill governs concept fidelity and restraint.

## Objective
Apply the approved Margin spec to the shared palette, typography, marketing, auth and public product branding so the first impression is no longer neon/glassmorphism.

## Scope
`tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(marketing)/{layout,page}.tsx`, active marketing components, auth page/components, `src/app/manifest.ts` and `src/app/opengraph-image.tsx` where needed. Do not edit pricing config, API, AI, DB, route structure, user-modified files, or media/logo assets unless essential and verified.

## Definition of done
A/Margin palette and UI foundation appear on landing/auth; primary/secondary CTAs retain live routes; pricing still reads config; first screen shows J-Star Projects; metadata and PWA names match; responsive and focus behavior preserved. No invented prices, metrics or testimonial claims. The landing hero communicates real offer and project-notebook signature without Canvas/WebGL or continuous motion.

## Expected artifacts
Production UI edits in the named files, focused check output and a short summary of any unresolved surfaces.

## Constraints and verification
Read active code before editing. Implement the notebook motif as document preview and current-step rule; keep existing features and content sections, remove decorative glows, glass, floating icons, gratuitous motion. Prefer Tailwind semantic colors and small CSS rules, not blanket replacements in unrelated admin/partner screens. `bg-dark` and `text-white` consumers require attention; if global retoken would harm untouched screens, keep dark semantic and scope new tokens to renamed classes. No edits to package scripts, lockfile, .env, README. Preserve outside user work. Lint edited files and typecheck if feasible. Report exact files and outcomes.
