import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('👻 Starting Ghost Data Cleanup...');

    // 1. Get all valid User IDs
    const users = await prisma.user.findMany({ select: { id: true } });
    const validUserIds = new Set(users.map(u => u.id));
    console.log(`✅ Found ${validUserIds.size} valid users.`);

    // 2. Clean Leads
    const leads = await prisma.lead.findMany({
        where: { userId: { not: null } },
        select: { id: true, userId: true }
    });

    const ghostLeads = leads.filter(l => !validUserIds.has(l.userId!));

    if (ghostLeads.length > 0) {
        console.log(`Found ${ghostLeads.length} ghost Leads. Deleting...`);
        await prisma.lead.deleteMany({
            where: {
                id: { in: ghostLeads.map(l => l.id) }
            }
        });
        console.log('🧹 Ghost Leads cleaned.');
    } else {
        console.log('✨ No ghost Leads found.');
    }

    // 3. Clean Topic Switch Requests
    const requests = await prisma.topicSwitchRequest.findMany({
        select: { id: true, userId: true }
    });

    const ghostRequests = requests.filter(r => !validUserIds.has(r.userId));

    if (ghostRequests.length > 0) {
        console.log(`Found ${ghostRequests.length} ghost Topic Switch Requests. Deleting...`);
        await prisma.topicSwitchRequest.deleteMany({
            where: {
                id: { in: ghostRequests.map(r => r.id) }
            }
        });
        console.log('🧹 Ghost Requests cleaned.');
    } else {
        console.log('✨ No ghost Requests found.');
    }

    console.log('🏁 Cleanup Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
