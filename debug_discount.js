
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDiscount() {
    try {
        const code = await prisma.discountCode.findUnique({
            where: { code: 'SAVE20' }
        });
        console.log('Discount Code Record:', JSON.stringify(code, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkDiscount();
