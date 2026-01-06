import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, name: true, role: true }
        });

        console.log("Current Users in Database:");
        console.table(users);
    } catch (error) {
        console.error("Error listing users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
