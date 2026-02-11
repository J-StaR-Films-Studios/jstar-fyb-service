import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// CRITICAL SECURITY FIX: Prevent hardcoded secret in production
const PARTNER_SECRET = process.env.PARTNER_AUTH_SECRET as string;

if (!PARTNER_SECRET) {
    throw new Error('PARTNER_AUTH_SECRET must be set in environment variables');
}

const COOKIE_NAME = 'partner_token';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function createSessionToken(payload: { id: string; email: string }): string {
    return jwt.sign(payload, PARTNER_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): { id: string; email: string } | null {
    try {
        return jwt.verify(token, PARTNER_SECRET) as { id: string; email: string };
    } catch {
        return null;
    }
}

export async function getPartnerSession() {
    // 1. Check for standard User Session (New Flow)
    // We import dynamically to avoid circular deps if any, though checking headers is safe
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");

    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (session?.user?.email) {
            // Find influencer by email
            const influencer = await prisma.influencer.findUnique({
                where: { email: session.user.email },
            });
            if (influencer) return influencer;
        }
    } catch (error) {
        // Ignore auth errors, fall through to legacy check
    }

    // 2. Legacy Cookie Check (Deprecated but kept for transition if needed)
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) return null;

    try {
        const influencer = await prisma.influencer.findUnique({
            where: { id: payload.id },
        });
        return influencer;
    } catch {
        return null;
    }
}

export async function setPartnerCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });
}

export async function clearPartnerCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}
