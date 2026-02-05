#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function preMigrationCheck() {
    console.log('🚨 PRE-MIGRATION SAFETY CHECK 🚨\n');
    
    // Check if recent backup exists
    const backupPath = join(process.cwd(), 'database-backup.json');
    if (!existsSync(backupPath)) {
        console.log('❌ NO BACKUP FOUND!');
        console.log('Run: npm run db:backup');
        console.log('Then try again.\n');
        process.exit(1);
    }
    
    // Check backup age
    const stats = require('fs').statSync(backupPath);
    const backupAge = Date.now() - stats.mtime.getTime();
    const minutesOld = Math.floor(backupAge / 60000);
    
    if (minutesOld > 5) {
        console.log(`⚠️  Backup is ${minutesOld} minutes old. Consider creating a fresh backup.`);
        console.log('Run: npm run db:backup\n');
    }
    
    // Check current data
    console.log('📊 Current Database Status:');
    const tables = ['users', 'leads', 'projects', 'payments'];
    
    for (const table of tables) {
        try {
            const count = await (prisma as any)[table].count();
            console.log(`   ${table}: ${count} records`);
        } catch (e) {
            console.log(`   ${table}: Error checking`);
        }
    }
    
    console.log('\n✅ Pre-migration check complete. You can proceed with migration.');
    console.log('   If migration fails, restore with: npm run db:restore');
}

preMigrationCheck()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
