import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logger, securityLogger } from '@/lib/logger';

const emailSchema = z.string().trim().email().max(255);
const updateSchema = z.object({
    projectId: z.string().min(1),
    action: z.enum(['grant', 'revoke'])
});

export async function GET(request: Request) {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = emailSchema.safeParse(new URL(request.url).searchParams.get('email'));
    if (!email.success) {
        return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.data },
            select: {
                id: true, name: true, email: true,
                projects: {
                    where: { mode: 'DIY' },
                    select: { id: true, topic: true, isUnlocked: true, testerAccess: true },
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ user });
    } catch (error) {
        logger.error(error, '[AdminTesterAccess] Lookup failed');
        return NextResponse.json({ error: 'Could not look up projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const input = updateSchema.safeParse(body);
    if (!input.success) {
        return NextResponse.json({ error: 'Invalid project or action' }, { status: 400 });
    }

    try {
        const { projectId, action } = input.data;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, mode: true }
        });
        if (!project?.userId || project.mode !== 'DIY') {
            return NextResponse.json({ error: 'Owned DIY project not found' }, { status: 404 });
        }

        const updated = await prisma.project.updateMany({
            where: {
                id: projectId,
                userId: project.userId,
                mode: 'DIY',
                testerAccess: action === 'revoke',
                ...(action === 'grant' ? { isUnlocked: false } : {})
            },
            data: { testerAccess: action === 'grant' }
        });
        if (updated.count === 0) {
            return NextResponse.json({ error: 'Project access has changed. Refresh and try again.' }, { status: 409 });
        }

        securityLogger.dataAccess({
            userId: admin.id,
            resource: `project:${projectId}`,
            action: `${action}_tester_access`
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(error, '[AdminTesterAccess] Update failed');
        return NextResponse.json({ error: 'Could not update tester access' }, { status: 500 });
    }
}
