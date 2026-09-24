# DIY project tester access

## Goal

Let an admin give a registered tester access to one existing DIY project's paid workspace, then revoke that pass without changing payments or access to projects the user bought.

## Client and server

- `/admin/projects` links to `/admin/tester-access`. The admin enters the user's exact account email, selects one of their DIY projects, and grants or revokes a pass.
- `/api/admin/tester-access` requires an admin session for both lookup and updates. Grants require an owned, unpaid DIY project. Revocations only clear the pass; neither action modifies payment records or `isUnlocked`.
- The workspace page checks the project's paid unlock or a tester pass held by the signed-in project owner. The builder hydrates its existing paywall UI using either form of access. Chapter generation, editing, version history, chat, threads, diagrams and export also check ownership and either form of access on the server.
- Signing out or revoking Better Auth sessions is separate. A revoked pass can no longer open the workspace, but a purchased unlock remains usable.

## Data flow and schema

`Project.testerAccess` is a Boolean, default `false`. Admin grant sets it to `true`; revoke sets it to `false`. Existing `Project.isUnlocked` continues to represent paid or discount-based unlocks. A payment made while a pass is active sets `isUnlocked` as usual; removing the pass later does not change that paid unlock. No new table or user role is needed.

## Boundary

These checks cover the paid DIY workspace APIs. Free builder routes for abstract and outline generation remain available before payment. Shared research and document routes also serve free flows and are not disabled by revoking a tester pass. Revocation does not delete existing content or suspend the account.
