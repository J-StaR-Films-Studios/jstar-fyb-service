# Task 01: Map the live student journey

## Agent setup
Follow `vibe-genesis`. Read `../master_plan.md`, `docs/Project_Requirements.md`, `docs/mockups/rebrand-directions.html` and `docs/features/FR-001_Agency_Landing_Page.md`. Use no optional overlays; this task is read-only.

## Objective
Identify exactly which screens and components need Margin styling without accidentally changing the current authentication, builder, payment or writing flows.

## Scope
Inspect active marketing, auth, SaaS shell, dashboard, project builder, desktop/mobile v2 writing workspace, theme, metadata and visible product naming. Separate active routes from old variants. Record which files already have unrelated user edits.

## Context
The approved direction is A/Margin and the customer-facing name is J-Star Projects. `src/features/builder/components/v2/ChapterEditor.tsx` is the active workspace; `ProjectWorkspaceLayout.tsx` is not its route entry point.

## Definition of done
A path-based map covers all listed journeys, identifies shared styling risks, and names operational strings and files that must remain untouched.

## Expected artifacts
Read-only audit handoff to the orchestrator; no production code or data changes.

## Constraints and verification
Do not read secret values or edit code. Compare imports and route files before recommending a component. The orchestrator checks the map against actual source before the Design task starts.
