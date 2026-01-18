import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking recent projects...");

    const projects = await prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${projects.length} recent projects:`);
    projects.forEach((p: any) => {
        console.log(`\nProject ID: ${p.id}`);
        console.log(`Topic: ${p.topic}`);
        console.log(`Status: ${p.status}`);
        console.log(`Owner (Verified): ${p.userId || '❌ ANONYMOUS'}`);
        console.log(`Anonymous Cookie ID: ${p.anonymousId || 'N/A'}`);
        console.log(`----------------------------------------`);
    });

    console.log("\n🔍 Checking Users...");
    const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            sessions: true
        }
    });
    users.forEach((u: any) => {
        console.log(`User: ${u.name} (${u.email})`);
        console.log(`ID: ${u.id}`);
        console.log(`Sessions: ${u.sessions.length}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
