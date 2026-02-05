# Lead Dashboard Issue - Research Findings

**Date:** 2026-02-04
**Updated:** 2026-02-04 (Added safer migration options & Vercel clarification)

---

## Executive Summary

The leads are not showing up on the admin dashboard. This is likely due to **one of several root causes** related to database connectivity, schema synchronization, or data integrity issues after the AI agent modified the database schemas.

---

## System Architecture Overview

### Current Database Configuration
- **Provider:** PostgreSQL (Neon DB - Cloud)
- **Connection:** `ep-calm-dust-abrefug6-pooler.eu-west-2.aws.neon.tech/neondb`
- **Environment:** Production/Cloud (not local SQLite)

### Lead Data Flow
```
User Chat (Jay Bot) → saveLeadAction() → Prisma Upsert → Neon PostgreSQL → Admin Dashboard
```

---

## 🔴 1. Migrations Not Applied (HIGH PROBABILITY)

**Evidence:**
- The migrations folder only contains `migration_lock.toml`
- No actual migration files exist in `prisma/migrations/`
- The AI agent may have modified the schema without running `prisma migrate deploy`

### ✅ SAFER Options (No Data Loss!)

**Option A: Use `prisma db push` (Safest)**
```bash
# This syncs schema without deleting data - USE THIS FIRST!
npx prisma db push
```
- ✅ Non-destructive - adds missing columns/tables
- ✅ Safe for development
- ⚠️ Doesn't run migrations, just syncs schema

**Option B: Create & Apply Migration (Proper Way)**
```bash
# Check what needs to be migrated
npx prisma migrate status

# Create a new migration
npx prisma migrate dev --name schema_fix
```
- ✅ Proper migration workflow
- ✅ Keeps data intact
- ✅ Creates migration file for version control

**Option C: Reset with Data Backup (If needed)**
```bash
# 1. FIRST: Export your data (see section 3 below)
# 2. If you must reset:
npx prisma migrate reset --force

# 3. Re-import data (seed)
```

### ❌ Dangerous (Will Delete Data)
```bash
npx prisma migrate reset --force  # DON'T USE THIS!
```

---

## 🟡 2. Vercel & Migrations - Important Clarification

**Does Vercel run migrations?**
- ❌ **NO** - Vercel does NOT automatically run Prisma migrations
- ✅ Vercel **does** run `prisma generate` during build
- ✅ You need to run migrations **manually** or set up CI/CD

### How to Set Up Vercel Migrations

**Option A: Manual Deployment (After you run migrations locally)**
```bash
# 1. Run migrations on Neon
npx prisma migrate deploy

# 2. Deploy to Vercel
vercel --prod
```

**Option B: Vercel Deploy Hooks (Automatic)**
1. Go to Vercel Dashboard → Settings → Git → Deploy Hooks
2. Create a hook like "Database Migration"
3. Add the hook URL to your GitHub Actions or CI pipeline
4. The hook triggers after code deploys

**Option C: Neon Branching (Recommended for safety)**
- Neon supports database branching
- Create a preview branch → test migrations → promote to main
- Much safer for production!
- No data loss risk when testing schema changes

---

## 🟡 3. How to Backup/Restore Data (Don't Lose Your Leads!)

### Before Any Migration Work - BACKUP FIRST!

**Export Leads to JSON (Quick):**
```bash
# Run the debug script to export
npx tsx scripts/debug-leads.ts > leads_backup.json
```

**Export Using pg_dump (Full Database):**
```bash
# Install PostgreSQL tools first, then:
pg_dump "postgresql://neondb_owner:npg_NC2BQYVi1OLJ@ep-calm-dust-abrefug6-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" > backup_$(date +%Y%m%d).sql
```

**Export from Neon Console (Web UI):**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to Branches
4. Create a branch (this is a point-in-time snapshot)
5. Export from the branch if needed

### Import Data Back:
```bash
# After reset, import SQL backup:
psql "postgresql://..." < backup_20260204.sql

# Or for JSON:
# Create a seed script to import leads_backup.json
```

---

## 🟡 4. Network/Connectivity Issues with Neon DB (MEDIUM PROBABILITY)

**Evidence:**
- User mentioned "bad local network" causing potential issues
- Neon is a cloud database requiring stable internet connection
- Connection string uses SSL (`sslmode=require`)

**Symptoms:**
- Slow page loads
- Timeout errors
- Empty data returns

**Check:**
```bash
# Test database connection
npx prisma db execute
```

**Fix:**
- Use a more stable network connection
- Try the **unpooled** connection string:
  ```
  DATABASE_URL="postgresql://neondb_owner:npg_NC2BQYVi1OLJ@ep-calm-dust-abrefug6.eu-west-2.aws.neon.tech/neondb?sslmode=require"
  ```

---

## 🟡 5. Schema/Field Mismatch (MEDIUM PROBABILITY)

**Current Lead Schema:**
```prisma
model Lead {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  whatsapp    String   @unique
  department  String
  topic       String
  twist       String
  complexity  Int
  status      String   @default("NEW")
  userId      String?
  anonymousId String?
  tier        String?
  source      String   @default("JAY_CHAT")
  name        String?
  email       String?

  @@index([userId])
  @@index([anonymousId])
  @@index([status])
  @@index([createdAt])
}
```

**Check:**
```sql
-- Connect to Neon and run:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Lead';
```

---

## 🟡 6. Empty Database / No Leads Created (LOW PROBABILITY)

**Check:**
```bash
# Run the debug script
npx tsx scripts/debug-leads.ts

# Or in psql:
SELECT COUNT(*) FROM "Lead";
```

---

## 🟡 7. Prisma Client Not Regenerated (LOW PROBABILITY)

**Fix:**
```bash
# Regenerate Prisma client
npx prisma generate

# Restart dev server
```

---

## Recommended Safe Migration Path

### Step 1: BACKUP FIRST (CRITICAL!)
```bash
# Export leads data
npx tsx scripts/debug-leads.ts > leads_backup.json
```

### Step 2: Check Current State
```bash
# See what's in database vs schema
npx prisma migrate status
```

### Step 3: Apply Safe Fix
```bash
# Sync schema without deleting data - USE THIS!
npx prisma db push
```

### Step 4: Regenerate Client
```bash
npx prisma generate
```

### Step 5: Test
```bash
# Run dev server and check admin dashboard
npm run dev
```

---

## Diagnostic Commands Summary

| Command | Purpose | Risk |
|---------|---------|------|
| `npx prisma migrate status` | Check migration state | None |
| `npx prisma db push` | Sync schema | Low (safe) |
| `npx prisma migrate deploy` | Apply migrations | Low |
| `npx prisma migrate dev` | Create & apply migration | Medium |
| `npx prisma migrate reset` | Reset database | HIGH (deletes data!) |
| `npx prisma db push --force-reset` | Push with reset | HIGH (deletes data!) |

---

## Files to Review

| File | Purpose |
|------|---------|
| [`prisma/schema.prisma`](prisma/schema.prisma) | Lead model definition |
| [`src/features/bot/actions/chat.ts`](src/features/bot/actions/chat.ts:308-360) | Lead capture logic |
| [`src/app/admin/leads/page.tsx`](src/app/admin/leads/page.tsx) | Admin display page |
| [`scripts/debug-leads.ts`](scripts/debug-leads.ts) | Debug utility |

---

## Next Steps

1. **Backup your data first** (export leads to JSON)
2. **Run diagnostics:**
   ```bash
   npx prisma migrate status
   npx prisma db push
   ```
3. **Report results** so I can identify exact fix

---

*Research completed by VibeCode Orchestrator - 2026-02-04*
