## 2024-05-23 - [Missing User Indexes]
**Learning:** Frequent queries by `userId` in `Project` and `Payment` tables were missing database indexes, causing potential performance bottlenecks as data grows.
**Action:** Always check `prisma/schema.prisma` for missing indexes on foreign keys, especially those frequently used in `where` clauses (like `userId` in SaaS apps). Postgres does not index FKs automatically.

## 2025-01-29 - [Dual-Identification Indexing]
**Learning:** Models like `Lead` and `Conversation` use both `userId` and `anonymousId` for tracking. Both fields are frequently queried (often in `OR` clauses or separately) and must be indexed to avoid table scans, especially during session merging.
**Action:** When adding models with dual-identification (auth + anonymous), always index both fields.

## 2026-01-16 - [Prisma Undefined Filter Risk]
**Learning:** In Prisma, passing `undefined` to a `where` clause field (e.g., `where: { userId: undefined }`) causes the filter to be ignored, potentially returning all records in the table. This is a critical security and performance risk when using optional chaining like `user?.id` without checking existence.
**Action:** Always guard Prisma queries with explicit checks (e.g., `if (!user) return null`) or ensure values are never undefined (e.g. `userId: user.id` after a check). Prefer `findFirst` over `findMany` when only one record is needed to avoid over-fetching.

## 2025-05-23 - [Component Definition Anti-Pattern]
**Learning:** Defining React components inside other components (e.g. `const Badge = () => ...`) forces a full unmount/remount on every render. In heavy editors, this causes unnecessary layout thrashing and state loss.
**Action:** Extract sub-components to separate files or outside the main component. Use `React.memo` for UI elements that receive frequent updates (like save status) but rarely change visually.

