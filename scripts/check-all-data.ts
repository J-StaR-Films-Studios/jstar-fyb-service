import { prisma } from '../src/lib/prisma';

async function checkAllData() {
    console.log('=== Checking All Database Tables ===\n');
    
    const tables = [
        { name: 'Users', model: prisma.user },
        { name: 'Leads', model: prisma.lead },
        { name: 'Projects', model: prisma.project },
        { name: 'Payments', model: prisma.payment },
        { name: 'Conversations', model: prisma.conversation },
        { name: 'Messages', model: prisma.message },
        { name: 'Influencers', model: prisma.influencer },
        { name: 'Commissions', model: prisma.commission },
        { name: 'DiscountCodes', model: prisma.discountCode },
    ];
    
    for (const table of tables) {
        try {
            const count = await (table.model as any).count();
            console.log(`${table.name}: ${count} records`);
            
            if (count > 0 && count <= 5) {
                // Show first few records if there are some
                const records = await (table.model as any).findMany({ take: 3 });
                records.forEach((record: any, i: number) => {
                    console.log(`  ${i + 1}. ${JSON.stringify(record, null, 2).substring(0, 200)}...`);
                });
            }
        } catch (error) {
            console.log(`${table.name}: Error - ${error}`);
        }
        console.log('');
    }
}

checkAllData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
