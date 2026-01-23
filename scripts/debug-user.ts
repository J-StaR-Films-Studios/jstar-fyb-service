
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error("Please provide an email address");
        process.exit(1);
    }

    console.log(`Checking user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log("User found:", {
        id: user.id,
        name: user.name,
        email: user.email,
    });

    console.log("Accounts:", user.accounts.map(a => ({
        provider: a.providerId,
        hasPassword: !!a.password,
        passwordLength: a.password?.length,
        passwordValue: a.password ? (a.password.substring(0, 10) + "...") : "NULL"
    })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
