@echo off
REM Fix Prisma Migration Issue for Neon Database
REM This script resolves the P3009 failed migration error

echo ==========================================
echo Prisma Migration Fix for Neon Database
echo ==========================================
echo.

REM Step 1: Check current migration status
echo Step 1: Checking current migration status...
npx prisma migrate status
echo.

echo Step 2: Attempting to resolve the failed migration...
echo This will mark the 20260123221134_fresh_reset migration as applied.
echo.

REM Step 2: Mark the failed migration as resolved
npx prisma migrate resolve --applied 20260123221134_fresh_reset

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to resolve migration automatically.
    echo Please use the manual SQL approach documented in fix-migration-resolution.md
    exit /b 1
)

echo.
echo Step 3: Deploying remaining migrations...
npx prisma migrate deploy

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to deploy migrations.
    exit /b 1
)

echo.
echo Step 4: Verifying migration status...
npx prisma migrate status

echo.
echo Step 5: Generating Prisma client...
npx prisma generate

echo.
echo ==========================================
echo Migration fix complete!
echo ==========================================
echo.
echo If you still see errors, please refer to:
echo scripts/fix-migration-resolution.md
echo.

pause