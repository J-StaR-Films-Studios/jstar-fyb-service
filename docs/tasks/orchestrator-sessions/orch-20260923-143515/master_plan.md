# Margin rebrand: J-Star Projects

## Decision
The approved direction is Margin: a project notebook, grey-green paper, green ink and a restrained rust-red margin rule. The customer-facing name becomes J-Star Projects. Keep existing routes, technical identifiers, payment logic and the J-Star legal owner intact.

## Goal
Replace the current neon/glassmorphism look on the public landing page and core student journey with a coherent, readable writing-and-research identity. Deliver a walkthrough so the owner can inspect and continue the rollout.

## Scope
- Genesis: map active visual entry points, theme usage, brand strings and user-edited files. Record visual constraints and factual copy sources.
- Design: define colors, type, controls, responsive behavior, and a single notebook-inspired motif. Use the approved `docs/mockups/rebrand-directions.html` concept as reference, not as production markup.
- Build: apply the system to marketing, auth, SaaS shell/dashboard, project creation and writing workspace. Update customer-facing app metadata and manifest. Avoid changing flows or databases.
- Verification: focused lint/type/build checks where practical, inspect rendered pages at desktop/mobile if accessible, review for scope and regression. Produce `docs/walkthroughs/margin_rebrand.md` and `docs/features/Margin_Rebrand.md`.

## Guardrails
Existing edits to AI services, documentation, environment setup and dependencies belong to the user; do not alter or revert them. No migrations, deployments or external writes. Real prices and project samples must come from the app or be clearly described as illustrative. Preserve keyboard interaction, mobile navigation, current routes, and reduced-motion access. CSS first, no Canvas/WebGL for a writing tool.

## Stages
1. Genesis audit and constraints; identify the current components and safe boundaries.
2. Design the visual system and map it to existing UI primitives.
3. Build marketing and application surfaces without replacing their logic.
4. Verify and document results. One focused review pass; only correct confirmed regressions.

## Creative-web reference receipt
`frontend-ui/creative-web-development/SKILL.md`: user-supplied concept stays intact; choose the smallest implementation that expresses it. `references/concept-evaluation.md`: the first action must remain findable in ten seconds; unverified product claims do not appear as facts. No animation loop, smooth-scroll orchestration, Canvas, WebGL, or persistent media is planned, so no advanced rendering reference is needed.

## Core concept
The project lives in a working notebook: chapter order, research citations and editing context read like parts of one file. The rust-red margin marks the current step and the next action, not every decorative edge.
