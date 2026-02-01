-- Manual SQL Fix for Failed Prisma Migration
-- Run this on your Neon database if the automatic resolution fails

-- ============================================
-- STEP 1: Check current migration status
-- ============================================
SELECT 
    migration_name,
    finished_at,
    applied_steps_count,
    logs,
    rolled_back_at,
    started_at
FROM _prisma_migrations 
WHERE migration_name = '20260123221134_fresh_reset';

-- ============================================
-- STEP 2: Mark the failed migration as applied
-- ============================================
-- This tells Prisma that the migration completed successfully
-- Only run this if the database schema already matches what the migration would create

UPDATE _prisma_migrations 
SET 
    finished_at = NOW(), 
    applied_steps_count = 1,
    logs = NULL,
    rolled_back_at = NULL
WHERE migration_name = '20260123221134_fresh_reset';

-- ============================================
-- STEP 3: Verify the fix
-- ============================================
SELECT 
    migration_name,
    finished_at,
    applied_steps_count,
    logs,
    rolled_back_at
FROM _prisma_migrations 
ORDER BY finished_at DESC;

-- ============================================
-- ALTERNATIVE: If the migration record doesn't exist at all
-- ============================================
-- Use this if the migration is not in the _prisma_migrations table
-- INSERT INTO _prisma_migrations (
--     id,
--     migration_name,
--     checksum,
--     finished_at,
--     migration_time,
--     applied_steps_count,
--     logs,
--     rolled_back_at,
--     started_at
-- ) VALUES (
--     gen_random_uuid(),
--     '20260123221134_fresh_reset',
--     '', -- You may need to calculate the actual checksum
--     NOW(),
--     0,
--     1,
--     NULL,
--     NULL,
--     NOW()
-- );

-- ============================================
-- EMERGENCY ONLY: Delete all migrations and start fresh
-- WARNING: Only use this if you are SURE the schema is correct
-- ============================================
-- DELETE FROM _prisma_migrations;
-- Then use: npx prisma migrate resolve --applied 20260123221134_fresh_reset