import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error("Please provide a user email: npx tsx scripts/promote-admin.ts user@example.com");
        process.exit(1);
    }

    try {
        const users = await prisma.user.findMany({ select: { email: true } });

        if (users.length === 0) {
            console.error("\n❌ No users found in database.");
            console.log("👉 Please log in to the website first to create your account, then run this script again.");
            process.exit(1);
        }

        const user = await prisma.user.update({
            where: { email },
            data: { role: "ADMIN" }
        });

        console.log(`\n✅ Successfully promoted ${user.name} (${user.email}) to ADMIN!`);
    } catch (error) {
        if ((error as any).code === 'P2025') {
            console.error(`\n❌ User with email "${email}" not found.`);
            console.log("👉 Make sure you have logged in with this email on the site first.");
        } else {
            console.error(`\n❌ Error promoting user: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
