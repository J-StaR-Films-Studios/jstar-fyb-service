
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database connection and content...');

    try {
        const userCount = await prisma.user.count();
        const projectCount = await prisma.project.count();
        const influencerCount = await prisma.influencer.count();
        const discountCodeCount = await prisma.discountCode.count();
        const paymentCount = await prisma.payment.count();

        console.log('--------------------------------');
        console.log('Database Status: CONNECTED');
        console.log('--------------------------------');
        console.log(`Users: ${userCount}`);
        console.log(`Projects: ${projectCount}`);
        console.log(`Influencers: ${influencerCount}`);
        console.log(`Discount Codes: ${discountCodeCount}`);
        console.log(`Payments: ${paymentCount}`);
        console.log('--------------------------------');

        if (userCount === 0 && projectCount === 0) {
            console.log('⚠️  Database appears to be empty.');
        } else {
            console.log('✅  Database contains data.');
        }

    } catch (error) {
        console.error('❌  Error connecting to database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
