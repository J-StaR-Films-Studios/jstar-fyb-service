
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Influencer Auth Seeding...');
    console.log('⚠️  SKIPPING: Password field removed from Influencer model for security (P0 fix).');
    console.log('ℹ️  Influencers should now authenticate via standard User accounts linked by email.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
