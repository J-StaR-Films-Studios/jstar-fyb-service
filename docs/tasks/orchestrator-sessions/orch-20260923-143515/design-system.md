# Design: Margin for J-Star Projects

## Objective
Turn the approved Margin visual study into an implementation-ready student-facing system while keeping real app journeys intact.

## Scope
Define palette, type hierarchy, surfaces, buttons, focus, status colors, chapter/navigation treatment, and responsive rules. Map decisions to landing, auth, dashboard, builder, writing canvas and research shelf. No API, data, route or business logic changes.

## Definition of done
The spec tells a coder what to change on every active surface, explains the single signature margin treatment, passes contrast for normal text, and explains mobile and reduced-motion variants. Copy references existing product capabilities and avoids invented metrics or sample projects presented as real.

## Expected artifacts
`docs/features/Margin_Rebrand.md` with goal, affected client/server components, data flow, schema, visual spec and adoption order. No app code.

## Instructions
Use `docs/mockups/rebrand-directions.html` direction A as source. Keep J-Star owner; customer-facing product name is J-Star Projects. Review existing auth, marketing, builder and workspace components and project requirements before writing. Smallest coherent style system; do not introduce Canvas, WebGL, particles, scroll hijacking, decorative cards, or a new component library. Treat rust-red as action/current-step marker, not a universal fill. Preserve live prices and functional CTAs. Do not touch modified user files.
