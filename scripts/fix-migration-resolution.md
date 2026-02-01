# Prisma Migration Resolution Plan

## Problem Diagnosis

Based on the `prisma migrate status` output, the issue is clear:

### Current State

**Local migrations folder has:**
- `20260123221134_fresh_reset` (marked as last common migration)
- `20260123232131_secure_influencer_schema`
- `20260124001010_add_influencer_payout_config`

**Neon database has these migrations (NOT found locally):**
- `20260105064044_fresh_reset`
- `20260106103816_add_system_setting`
- `20260107101141_add_thread_fields`
- `20260108095154_add_reasoning_field`
- `20260108143751_add_project_diagrams`
- `20260110225313_fresh_reset` (duplicate name!)
- `20260110234105_add_influencer_auth`
- `20260111002619_add_influencer_bank_details`
- `20260111045114_add_referral_fields`

**Status:**
- The `20260123221134_fresh_reset` migration started at 2026-01-24 14:01:20.003206 UTC **FAILED**
- 2 migrations have not yet been applied (the secure_influencer_schema and add_influencer_payout_config)

### Root Cause

1. **Multiple "fresh_reset" migrations exist** - The database has older `fresh_reset` migrations from earlier dates (Jan 5, Jan 10) that are NOT in the local migrations folder.
2. **Migration history mismatch** - The local `20260123221134_fresh_reset` is trying to create tables that already exist from previous migrations.
3. **Failed migration** - The migration started but failed partway through, leaving the database in an inconsistent state.

### Why the Migration Failed

The `20260123221134_fresh_reset` migration likely failed because:
- Tables like `User`, `Project`, `Payment`, etc. already exist from previous migrations
- The migration tried to `CREATE TABLE` for tables that already exist
- PostgreSQL threw an error and the migration was marked as failed

## Possible Sources of the Problem

1. **Migration folder was reset/cleaned locally** - Old migrations deleted, new "fresh_reset" created
2. **Database was migrated with different code** - Someone else or a different branch applied migrations
3. **Switch from SQLite to PostgreSQL** - Migration history didn't transfer properly
4. **Migration baselining gone wrong** - Attempt to baseline created conflicts
5. **Team member pushed conflicting migrations** - Different migration sequences
6. **Migration file corruption** - Files deleted or renamed incorrectly
7. **Neon database was migrated from a different source** - Database restored from backup with different history

## Most Likely Sources

1. **Migration folder cleanup** - Someone deleted old migrations and created a new "fresh_reset" thinking it would start fresh, but the database already had migrations applied.

2. **Database restored from different environment** - The Neon database may have been seeded/restored with migrations from a different setup (e.g., production data imported).

## Resolution Options

### Option 1: Mark Failed Migration as Resolved (SAFEST for Production)

**When to use:** Database schema already matches what the migration would create, but migration is marked as failed.

**Steps:**
```bash
# 1. Connect to Neon database and manually mark the migration as applied
# This requires direct database access via SQL

# Run this SQL on the Neon database:
UPDATE _prisma_migrations 
SET finished_at = NOW(), 
    applied_steps_count = 1,
    logs = NULL,
    rolled_back_at = NULL
WHERE migration_name = '20260123221134_fresh_reset';

# 2. Then apply the remaining migrations
npx prisma migrate deploy
```

**Pros:**
- No data loss
- Preserves existing data
- Fast resolution

**Cons:**
- Requires manual SQL intervention
- Need to verify schema matches

### Option 2: Baseline the Database (RECOMMENDED for this case)

**When to use:** The database schema is correct but migration history is completely out of sync.

**Steps:**
```bash
# 1. Mark the current database state as the baseline
npx prisma migrate resolve --applied 20260123221134_fresh_reset

# 2. Deploy remaining migrations
npx prisma migrate deploy
```

**Pros:**
- Official Prisma approach
- No data loss
- Clean history going forward

**Cons:**
- Requires the migration to exist locally (it does)
- May not work if migration is marked as failed

### Option 3: Reset and Reapply (DANGEROUS - Data Loss!)

**When to use:** Development environment only, no important data.

**Steps:**
```bash
# WARNING: This will DELETE ALL DATA
npx prisma migrate reset --force
```

**Pros:**
- Clean slate
- Simple

**Cons:**
- **ALL DATA WILL BE LOST**
- Not suitable for production

### Option 4: Manual Migration Fix

**When to use:** When you need to preserve data but fix the migration state.

**Steps:**
```bash
# 1. Create a backup first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Delete the failed migration record
# Run SQL:
DELETE FROM _prisma_migrations WHERE migration_name = '20260123221134_fresh_reset';

# 3. Verify schema is correct
npx prisma db pull

# 4. Create a new baseline migration
npx prisma migrate dev --create-only --name baseline_fix

# 5. Mark it as applied
npx prisma migrate resolve --applied <new_migration_name>
```

## Recommended Solution for Production Neon Database

Given this is a **production database with existing data**, I recommend **Option 2 (Baseline)** combined with verification:

### Step-by-Step Fix:

```bash
# Step 1: Verify current schema matches expected state
npx prisma db pull --print

# Step 2: Resolve the failed migration by marking it as applied
# This tells Prisma "the database already has this migration's changes"
npx prisma migrate resolve --applied 20260123221134_fresh_reset

# Step 3: Deploy remaining migrations
npx prisma migrate deploy

# Step 4: Verify migration status
npx prisma migrate status

# Step 5: Generate Prisma client
npx prisma generate
```

### If Option 2 Doesn't Work (Migration Still Fails):

Use the manual SQL approach:

```sql
-- Connect to Neon database and run:
-- 1. Check current migration status
SELECT migration_name, finished_at, applied_steps_count, logs 
FROM _prisma_migrations 
WHERE migration_name = '20260123221134_fresh_reset';

-- 2. If it shows as failed (rolled_back_at is NOT NULL or logs show error),
--    mark it as successfully applied:
UPDATE _prisma_migrations 
SET finished_at = NOW(), 
    applied_steps_count = 1,
    logs = NULL,
    rolled_back_at = NULL,
    started_at = COALESCE(started_at, NOW())
WHERE migration_name = '20260123221134_fresh_reset';

-- 3. Verify the update
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;
```

Then run:
```bash
npx prisma migrate deploy
```

## Verification Steps

After fixing, verify:

1. **Migration status is clean:**
   ```bash
   npx prisma migrate status
   ```
   Should show: "Database schema is up to date"

2. **Prisma client generates without errors:**
   ```bash
   npx prisma generate
   ```

3. **Application can connect to database:**
   ```bash
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

4. **Test a simple query in your app**

## Prevention

To prevent this in the future:

1. **Never delete migration files** after they've been applied to any shared database
2. **Always use `prisma migrate dev`** to create new migrations
3. **Use `prisma migrate deploy`** in production, never `migrate dev`
4. **Backup before major migrations:**
   ```bash
   pg_dump $DATABASE_URL > backup_before_migration.sql
   ```
5. **Consider using `prisma migrate diff`** to preview changes before applying

## Emergency Contacts/Resources

- Prisma Migration Troubleshooting: https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-baseline
- Neon Database Docs: https://neon.tech/docs/introduction
