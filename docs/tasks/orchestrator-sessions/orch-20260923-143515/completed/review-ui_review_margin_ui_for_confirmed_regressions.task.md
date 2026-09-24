# Task 05: Review the Margin build

## Agent setup
Follow `vibe-build` review. Read `../master_plan.md`, `docs/features/Margin_Rebrand.md`, `../review.md` and the unstaged presentation diff against HEAD. This task is read-only.

## Objective
Find real regressions caused by the rebrand, especially illegible text and lost interactions, without expanding the project into unrelated cleanup.

## Scope
Inspect marketing/auth, shell/dashboard/builder and active desktop/mobile v2 workspace. Check first-action discoverability, factual gallery wording, route preservation, editor formatting, save indicators, modal keyboard access, research controls and text contrast on light surfaces.

## Context
Pricing and project data remain sourced from the app. Existing AI/API files and unrelated user changes are outside scope. Some older child components still use dark styles, so inspect rendered combinations, not only modified lines.

## Definition of done
Report only confirmed issues with file paths, lines and effect on a real user. State checked surfaces and any verification limits. Do not make changes.

## Expected artifacts
A concise reviewer handoff to the orchestrator, who fixes confirmed blockers and records check results in `docs/walkthroughs/margin_rebrand.md`.

## Constraints and verification
One focused review pass. No speculative redesign, no edits, no claim that authenticated flows were browser-tested if they were not.
