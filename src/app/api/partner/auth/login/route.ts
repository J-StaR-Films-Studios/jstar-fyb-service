
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, createSessionToken, setPartnerCookie } from '@/lib/partner-auth';

const prisma = new PrismaClient();

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = loginSchema.parse(body);

        const influencer = await prisma.influencer.findUnique({
            where: { email },
        });

        if (!influencer) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (!influencer.password) {
            // Ideally we should handle this (maybe they haven't set one up yet), 
            // but for now, treat as invalid or not allowed.
            // The seed script ensures they have one.
            return NextResponse.json(
                { error: 'Account setup required. Please contact admin.' },
                { status: 403 }
            );
        }

        const isValid = await verifyPassword(password, influencer.password);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Login successful
        const token = createSessionToken({
            id: influencer.id,
            email: influencer.email,
        });

        await setPartnerCookie(token);

        // Update last login
        await prisma.influencer.update({
            where: { id: influencer.id },
            data: { lastLogin: new Date() },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: (error as any).errors[0].message },
                { status: 400 }
            );
        }
        console.error('Partner Login Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
