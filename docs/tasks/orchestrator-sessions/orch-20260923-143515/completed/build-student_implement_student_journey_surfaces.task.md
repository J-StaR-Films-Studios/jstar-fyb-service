# Task 04: Carry Margin through student screens

## Agent setup
Follow `vibe-build`. Read `../master_plan.md`, `docs/features/Margin_Rebrand.md`, `../build-student.md`, and the actual route/component tree at `src/app/(saas)/` and `src/app/(workspace)/`. The creative-web-development skill governs restraint and factual integrity.

## Objective
Make the signed-in journey feel like the same project notebook as the public site while keeping writing, payment and research behavior intact.

## Scope
Restyle `SaasShell`, dashboard components, the active `/project/builder` path and its step controls, `ChapterEditor` with desktop/mobile v2 editor, chapter navigation, save state, research shelf and directly used secondary dialogs. Leave AI services, persistence, payments and original user edits alone.

## Context
Public Margin tokens and typography were added in the previous task. Active writing uses `ChapterEditor`, not the legacy workspace shell. Existing project state, chapters, sources and save status are live data.

## Definition of done
Current project and step are readable on paper; rust indicates the active chapter, not every card. Desktop/mobile editing, save, export, research, diagrams, chat and lock state keep their current handlers and routes. Light panels do not inherit illegible dark-theme text.

## Expected artifacts
Focused presentation edits, `src/features/builder/components/v2/MarginEditor.module.css`, and check results for touched surfaces.

## Constraints and verification
Do not refactor the large editor's state machine or introduce placeholder project data. Run TypeScript and focused lint; visually inspect a signed-in project if a safe test account is available. Orchestrator performs one focused correctness review and fixes confirmed contrast regressions.
