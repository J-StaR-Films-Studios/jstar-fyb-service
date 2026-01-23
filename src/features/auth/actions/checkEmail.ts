"use server";

import { prisma } from "@/lib/prisma";

export async function checkEmailExists(email: string) {
    if (!email) return false;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const count = await prisma.user.count({
        where: {
            email: normalizedEmail
        }
    });

    return count > 0;
}
