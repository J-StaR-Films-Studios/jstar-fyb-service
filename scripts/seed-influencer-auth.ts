
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Influencer Auth Seeding...');

    // 1. Find all influencers
    const influencers = await prisma.influencer.findMany({
        where: {
            password: null, // Only those without passwords
        },
    });

    console.log(`Found ${influencers.length} influencers needing credentials.`);

    if (influencers.length === 0) {
        console.log('✅ All influencers already have credentials.');
        return;
    }

    // 2. Hash default password
    const DEFAULT_PASSWORD = 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // 3. Update all of them
    let updatedCount = 0;
    for (const influencer of influencers) {
        await prisma.influencer.update({
            where: { id: influencer.id },
            data: {
                password: hashedPassword,
            },
        });
        console.log(`Updated Credentials for: ${influencer.name} (${influencer.email})`);
        updatedCount++;
    }

    console.log(`\n✅ Successfully seeded auth for ${updatedCount} influencers.`);
    console.log('⚠️  DEFAULT PASSWORD IS:', DEFAULT_PASSWORD);
    console.log('⚠️  Please distribute this to partners and ask them to change it immediately.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
