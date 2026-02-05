# 🚨 SAFE MIGRATION PROTOCOL - READ BEFORE ANY DB CHANGES

## NEVER DO THESE WITHOUT BACKUP:
- `npx prisma migrate reset`
- `npx prisma db push --force-reset`
- `npx prisma migrate dev` (when schema drift exists)

## ALWAYS DO THIS FIRST:
```bash
# 1. Create backup
npm run db:backup

# 2. Check backup file exists
ls database-backup.json

# 3. ONLY THEN proceed with migrations
```

## RECOVERY COMMANDS:
```bash
# If data is lost, restore immediately:
npm run db:restore

# Or use Neon dashboard for point-in-time recovery
```

## THE RULE:
If you're about to run a migration command and you haven't run `npm run db:backup` in the last 5 minutes - STOP.

## WHAT HAPPENED:
We ran `npx prisma migrate dev` when schema drift existed, which triggered a database reset that deleted all data.

## HOW TO PREVENT:
1. Always backup before migrations
2. Use `npx prisma db pull` instead of `migrate dev` when possible
3. Test migrations on a branch first
