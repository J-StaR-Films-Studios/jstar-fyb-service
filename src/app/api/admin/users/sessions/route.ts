import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { logger, securityLogger } from "@/lib/logger";

const emailSchema = z.string().trim().email().max(255);
const revokeSchema = z.object({ userId: z.string().min(1) });

export async function GET(request: Request) {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const email = emailSchema.safeParse(new URL(request.url).searchParams.get("email"));
    if (!email.success) {
        return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.data },
            select: {
                id: true,
                name: true,
                email: true,
                _count: { select: { sessions: { where: { expiresAt: { gt: new Date() } } } } }
            }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ user: {
            id: user.id,
            name: user.name,
            email: user.email,
            activeSessions: user._count.sessions
        } });
    } catch (error) {
        logger.error(error, "[AdminUserSessions] Lookup failed");
        return NextResponse.json({ error: "Could not look up user" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const input = revokeSchema.safeParse(body);
    if (!input.success) {
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: input.data.userId },
            select: { id: true }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { count } = await prisma.session.deleteMany({
            where: { userId: user.id, expiresAt: { gt: new Date() } }
        });
        securityLogger.dataAccess({ userId: admin.id, resource: `user:${user.id}`, action: "revoke_sessions" });
        return NextResponse.json({ revoked: count });
    } catch (error) {
        logger.error(error, "[AdminUserSessions] Revocation failed");
        return NextResponse.json({ error: "Could not revoke sessions" }, { status: 500 });
    }
}
