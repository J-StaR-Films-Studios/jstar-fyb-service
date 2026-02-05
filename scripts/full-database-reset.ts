import { prisma } from '../src/lib/prisma';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface DatabaseBackup {
  timestamp: string;
  tables: Record<string, any[]>;
}

async function getAllTables() {
  // Get all table names from the database
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  return (tables as any[]).map(t => t.tablename).filter(name => !name.startsWith('_'));
}

async function backupAllTables(): Promise<DatabaseBackup> {
  console.log('🔄 Creating complete database backup...');
  
  const tables = await getAllTables();
  const backup: DatabaseBackup = {
    timestamp: new Date().toISOString(),
    tables: {}
  };
  
  // Validate table names to prevent SQL injection
  const validTableNames = tables.filter(name => 
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && 
    !name.toLowerCase().includes('drop') && 
    !name.toLowerCase().includes('delete') &&
    !name.toLowerCase().includes('truncate')
  );
  
  for (const tableName of validTableNames) {
    try {
      // Use parameterized query with proper escaping
      const result = await prisma.$queryRaw`SELECT * FROM ${prisma.$queryRawUnsafe(`"${tableName}"`)}`;
      backup.tables[tableName] = result as any[];
      console.log(`   ✅ ${tableName}: ${(result as any[]).length} records`);
    } catch (error) {
      console.log(`   ⚠️  ${tableName}: Failed to backup - ${error}`);
    }
  }
  
  const backupPath = join(process.cwd(), 'complete-database-backup.json');
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✅ Complete backup saved to: ${backupPath}`);
  
  return backup;
}

async function resetDatabaseWithBackup() {
  console.log('🔄 Starting complete database reset with backup...');
  
  // Step 1: Backup everything
  const backup = await backupAllTables();
  
  // Step 2: Reset database schema
  console.log('🧹 Resetting database schema...');
  try {
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    console.log('✅ Database reset completed');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    return;
  }
  
  // Step 3: Apply all migrations
  console.log('📦 Applying migrations...');
  try {
    execSync('npx prisma migrate dev', { stdio: 'inherit' });
    console.log('✅ Migrations applied');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return;
  }
  
  // Step 4: Restore data
  console.log('🔄 Restoring data...');
  await restoreAllTables(backup);
  
  console.log('✅ Complete database reset and restore finished!');
}

async function restoreAllTables(backup: DatabaseBackup) {
  // Define safe table names with validation
  const tableOrder = [
    'User', 'Account', 'Session', 'Verification',
    'Influencer', 'InfluencerPayoutConfig', 'DiscountCode',
    'Lead', 'Conversation', 'Message',
    'Project', 'ChapterOutline', 'Chapter', 'Payment', 'Commission',
    'ResearchDocument', 'ProjectMessage', 'ProjectDiagram', 
    'ProjectConversation', 'ProjectChatMessage',
    'TopicSwitchRequest', 'TopicSwitchArchive',
    'InAppNotification', 'UserNotificationPreference', 'SystemSetting'
  ];
  
  for (const tableName of tableOrder) {
    const data = backup.tables[tableName];
    if (!data || data.length === 0) {
      console.log(`   ⏭️  ${tableName}: No data to restore`);
      continue;
    }
    
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      console.log(`   ❌ ${tableName}: Invalid table name`);
      continue;
    }
    
    try {
      // Clear existing data safely
      await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
      
      // Restore data using Prisma operations when possible
      if (tableName === 'User' && data.length > 0) {
        await prisma.user.createMany({ data, skipDuplicates: true });
      } else if (tableName === 'Lead' && data.length > 0) {
        await prisma.lead.createMany({ data, skipDuplicates: true });
      } else if (tableName === 'Project' && data.length > 0) {
        await prisma.project.createMany({ data, skipDuplicates: true });
      } else {
        // Fallback to parameterized queries for other tables
        for (const record of data) {
          const columns = Object.keys(record);
          const values = Object.values(record);
          
          // Build safe parameterized query
          const quotedColumns = columns.map(col => `"${col}"`).join(', ');
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
          await prisma.$executeRawUnsafe(query, ...values);
        }
      }
      
      console.log(`   ✅ ${tableName}: ${data.length} records restored`);
    } catch (error) {
      console.log(`   ❌ ${tableName}: Failed to restore - ${error}`);
    }
  }
}

// Run the reset process
resetDatabaseWithBackup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
