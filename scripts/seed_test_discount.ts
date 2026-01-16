import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const code = 'TEST-VIP-100';
    const discount = {
        code,
        discountType: 'PERCENTAGE', // This is an enum in schema, usually "PERCENTAGE"
        discountValue: 100,
        maxUses: 100,
        isActive: true,
        expiresAt: new Date('2026-12-31')
    };

    try {
        // Check if exists
        const existing = await prisma.discountCode.findUnique({
            where: { code }
        });

        if (existing) {
            console.log(`Discount code ${code} already exists.`);
            // Update it to be active and have 100 uses
            await prisma.discountCode.update({
                where: { id: existing.id },
                data: {
                    isActive: true,
                    maxUses: 100,
                    discountValue: 100
                }
            })
            console.log('Updated existing code to ensure it is valid.');
        } else {
            // Create new
            await prisma.discountCode.create({
                data: {
                    code: discount.code,
                    discountType: 'PERCENTAGE',
                    discountValue: 100,
                    maxUses: 100,
                    isActive: true,
                    expiresAt: discount.expiresAt
                }
            });
            console.log(`Created new discount code: ${code}`);
        }

    } catch (error) {
        console.error('Error seeding discount code:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
