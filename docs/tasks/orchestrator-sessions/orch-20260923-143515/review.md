# Focused review: Margin UI implementation

## Objective
Find confirmed regressions, broken contrast, dead links and product claims introduced by the current rebrand diffs before handoff.

## Scope
Review only new unstaged UI changes against original HEAD in marketing/auth/student shell/dashboard/builder/v2 workspace, design spec and user request. Inspect active paths and interactions; do not audit unrelated existing problems or AI/API user changes.

## Definition of done
Return concise actionable issues with file/line and evidence, ranked by user impact; say which active surfaces were inspected. If no blocking issues, say so. Do not edit files.

## Expected artifacts
Read-only review in task response, feeding fixes and walkthrough.

## Instructions
Confirm behavior before flagging. Catch actual regressions in auth/marketing flow, research modal, builder step interaction, editor save, desktop/mobile contrast and metadata. Compare against HEAD for deleted behavior. No speculative enhancements, no style wish lists. Respect user edits and exact scope.
