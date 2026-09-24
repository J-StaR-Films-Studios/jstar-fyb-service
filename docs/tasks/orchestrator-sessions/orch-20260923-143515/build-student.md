# Build: Margin student journey

## Objective
Carry the approved notebook identity into the signed-in student journey, especially the live project and writing surfaces, while preserving functional flows.

## Scope
Student SaaS shell and dashboard components, main `/project/builder` creation route and its active view components, active `/project/[id]/workspace` v2 editor, chapter/timeline, research and mobile controls. Customer-facing product name on relevant student screens. Do not edit API/services/AI/DB/billing files or user-modified files.

## Definition of done
Student can identify current project, next step, chapters and research in paper/ink design; active chapter margin rule appears once; dashboard empty and populated states remain legible; builder progress and workspace tools/mobile navigation remain usable; no layout clipping at narrow widths; no invented live data or save state. Route links and existing conditional gates remain untouched.

## Expected artifacts
Production UI edits only to student-facing presentation files, focused checks and a concise handoff with uncovered items.

## Instructions
Read `docs/features/Margin_Rebrand.md` and the actual active route hierarchy. Build after public foundation lands; do not import a legacy workspace shell or rewrite state logic. Favor simple Tailwind restyling of active components and shared UI classes. Avoid rewriting entire large editor modules; treat real research/saving status as live data. Ensure buttons and inputs have readable contrast on light background. If a component has complex existing behavior, preserve it rather than refactor. Keep admin/partner outside scope. No files modified by user at session start.
