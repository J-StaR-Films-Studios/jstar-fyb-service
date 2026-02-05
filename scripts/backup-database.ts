import { prisma } from '../src/lib/prisma';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// Schema for validating backup data
const BackupRecordSchema = z.object({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  // Add other common fields as needed
});

const DatabaseBackupSchema = z.object({
  timestamp: z.string(),
  tables: z.object({
    users: z.array(z.any()), // Use any for flexibility, will be validated by Prisma
    leads: z.array(z.any()),
    projects: z.array(z.any()),
    payments: z.array(z.any()),
    conversations: z.array(z.any()),
    messages: z.array(z.any()),
  })
});

type DatabaseBackup = z.infer<typeof DatabaseBackupSchema>;

async function backupDatabase() {
  console.log('🔄 Starting database backup...');
  
  const backup: DatabaseBackup = {
    timestamp: new Date().toISOString(),
    tables: {
      users: await prisma.user.findMany(),
      leads: await prisma.lead.findMany(),
      projects: await prisma.project.findMany(),
      payments: await prisma.payment.findMany(),
      conversations: await prisma.conversation.findMany(),
      messages: await prisma.message.findMany(),
    }
  };

  const backupPath = join(process.cwd(), 'database-backup.json');
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Database backed up to: ${backupPath}`);
  console.log(`📊 Backed up ${Object.keys(backup.tables).length} tables`);
  
  // Log counts for each table
  Object.entries(backup.tables).forEach(([table, data]) => {
    console.log(`   - ${table}: ${data.length} records`);
  });
}

async function restoreDatabase(backupPath?: string) {
  console.log('🔄 Starting database restore...');
  
  const path = backupPath || join(process.cwd(), 'database-backup.json');
  
  try {
    const fileContent = readFileSync(path, 'utf-8');
    const parsedBackup = JSON.parse(fileContent);
    
    // Validate backup data structure
    const backup = DatabaseBackupSchema.parse(parsedBackup);
    
    console.log(`📦 Restoring backup from: ${backup.timestamp}`);
    
    // Clear existing data (in reverse order of dependencies)
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.project.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('🧹 Cleared existing data');
    
    // Restore data (in order of dependencies)
    await prisma.user.createMany({ data: backup.tables.users, skipDuplicates: true });
    await prisma.lead.createMany({ data: backup.tables.leads, skipDuplicates: true });
    await prisma.project.createMany({ data: backup.tables.projects, skipDuplicates: true });
    await prisma.payment.createMany({ data: backup.tables.payments, skipDuplicates: true });
    await prisma.conversation.createMany({ data: backup.tables.conversations, skipDuplicates: true });
    await prisma.message.createMany({ data: backup.tables.messages, skipDuplicates: true });
    
    console.log('✅ Database restored successfully');
    
    // Log restored counts
    Object.entries(backup.tables).forEach(([table, data]) => {
      console.log(`   - ${table}: ${data.length} records restored`);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Backup validation failed:', error.issues);
    } else if (error instanceof SyntaxError) {
      console.error('❌ Invalid JSON format in backup file:', error.message);
    } else {
      console.error('❌ Restore failed:', error);
    }
    throw error;
  }
}

// Command line interface
const command = process.argv[2];
const backupPath = process.argv[3];

if (command === 'backup') {
  backupDatabase().catch(console.error).finally(() => prisma.$disconnect());
} else if (command === 'restore') {
  restoreDatabase(backupPath).catch(console.error).finally(() => prisma.$disconnect());
} else {
  console.log('Usage:');
  console.log('  npm run db-backup backup');
  console.log('  npm run db-backup restore [backup-file-path]');
}
