## 2024-05-23 - [Missing User Indexes]
**Learning:** Frequent queries by `userId` in `Project` and `Payment` tables were missing database indexes, causing potential performance bottlenecks as data grows.
**Action:** Always check `prisma/schema.prisma` for missing indexes on foreign keys, especially those frequently used in `where` clauses (like `userId` in SaaS apps). Postgres does not index FKs automatically.

## 2025-01-29 - [Dual-Identification Indexing]
**Learning:** Models like `Lead` and `Conversation` use both `userId` and `anonymousId` for tracking. Both fields are frequently queried (often in `OR` clauses or separately) and must be indexed to avoid table scans, especially during session merging.
**Action:** When adding models with dual-identification (auth + anonymous), always index both fields.
