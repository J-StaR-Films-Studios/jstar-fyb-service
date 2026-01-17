import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// CRITICAL SECURITY FIX: Prevent hardcoded secret in production
// We check for actual deployment to avoid breaking local production builds
const isActuallyDeployed = process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;
const DEFAULT_SECRET = 'dev-partner-secret-key';
const PARTNER_SECRET = process.env.PARTNER_SECRET || process.env.BETTER_AUTH_SECRET || DEFAULT_SECRET;

if (process.env.NODE_ENV === 'production' && isActuallyDeployed && PARTNER_SECRET === DEFAULT_SECRET) {
    throw new Error('PARTNER_SECRET or BETTER_AUTH_SECRET must be set in production environment');
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
