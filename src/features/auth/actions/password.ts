"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export async function checkHasPassword() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        logger.info("[checkHasPassword] No session user found");
        return { hasPassword: true, hasName: true };
    }

    // Check if user has an account with a password
    const account = await prisma.account.findFirst({
        where: {
            userId: session.user.id,
            password: { not: null }
        }
    });

    const hasName = !!session.user.name && session.user.name !== "J-Star Client" && !session.user.name.includes("@");

    logger.info(`[checkHasPassword] User: ${session.user.id}, HasPassword: ${!!account}, HasName: ${hasName}`);
    return {
        hasPassword: !!account,
        hasName
    };
}

export async function setInitialPassword(password: string, name?: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error("Unauthorized");

    // Double check they don't have a password
    const existing = await prisma.account.findFirst({
        where: {
            userId: session.user.id,
            password: { not: null }
        }
    });

    if (existing) {
        throw new Error("Password already set. Please use the change password flow.");
    }

    try {
        // Hash password using bcryptjs (matching our auth check config)
        const { hash } = await import("bcryptjs");
        const hashedPassword = await hash(password, 10);

        const updateData: any = { password: hashedPassword };

        // If name is provided and user has no name/default name, update it too
        // We can do this via Prisma directly since we are the server
        if (name && session.user.name !== name) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { name: name }
            });
        }

        // Update Account Password
        // We need to find the specific account. Better-auth uses one account per provider mostly.
        // We want to attach this password to the 'credential' account usually, or ANY account?
        // Actually, if they logged in via magic-link, they might not have a 'credential' account record IF it was purely email-based?
        // But the checkHasPassword found an account.

        // If we want to allow login via Email+Password, we need an account with providerId="credential" (usually).
        // Magic Link might use providerId="email" or similar.
        // Let's upsert a credential account.

        const credentialAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                providerId: "credential"
            }
        });

        if (credentialAccount) {
            await prisma.account.update({
                where: { id: credentialAccount.id },
                data: { password: hashedPassword }
            });
        } else {
            // Create a new credential account for password login
            await prisma.account.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: session.user.id,
                    accountId: session.user.email, // Using email as accountId for credential provider
                    providerId: "credential",
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set password manually: ${errorMessage}`);
        throw error;
    }
}
