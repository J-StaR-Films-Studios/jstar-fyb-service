import { prisma } from '../src/lib/prisma';

async function debugLeads() {
    console.log('=== Debugging Lead Records ===\n');

    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`Total leads found: ${leads.length}\n`);

    for (const lead of leads) {
        console.log('--- Lead Record ---');
        console.log('ID:', lead.id);
        console.log('Created At:', lead.createdAt);
        console.log('WhatsApp:', lead.whatsapp);
        console.log('Department:', lead.department);
        console.log('Topic:', lead.topic);
        console.log('Twist:', lead.twist);
        console.log('Complexity:', lead.complexity);
        console.log('Status:', lead.status);
        console.log('Tier:', lead.tier);
        console.log('Source:', lead.source);
        console.log('Name:', lead.name);
        console.log('Email:', lead.email);
        console.log('UserId:', lead.userId);
        console.log('AnonymousId:', lead.anonymousId);
        console.log('');
    }

    // Check for any issues
    const leadsWithoutTier = await prisma.lead.count({ where: { tier: null } });
    const leadsWithTier = await prisma.lead.count({ where: { tier: { not: null } } });

    console.log('=== Summary ===');
    console.log('Leads WITH tier:', leadsWithTier);
    console.log('Leads WITHOUT tier:', leadsWithoutTier);
}

debugLeads()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
