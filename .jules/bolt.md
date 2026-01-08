## 2024-05-23 - [Missing User Indexes]
**Learning:** Frequent queries by `userId` in `Project` and `Payment` tables were missing database indexes, causing potential performance bottlenecks as data grows.
**Action:** Always check `prisma/schema.prisma` for missing indexes on foreign keys, especially those frequently used in `where` clauses (like `userId` in SaaS apps). Postgres does not index FKs automatically.
