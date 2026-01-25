import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { ResearchService } from '@/features/research/services/researchService';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { projectId } = body;

        if (!projectId) {
            return new NextResponse('Project ID required', { status: 400 });
        }

        // Sentinel: Prevent IDOR by verifying project ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true }
        });

        if (!project) {
            return new NextResponse('Project not found', { status: 404 });
        }

        const isAdmin = (user as { role?: string }).role === 'ADMIN';
        if (project.userId !== user.id && !isAdmin) {
            return new NextResponse('Forbidden: Access denied', { status: 403 });
        }

        // Generate Plan
        const plan = await ResearchService.generateResearchPlan(projectId);

        return NextResponse.json(plan);

    } catch (error: any) {
        console.error('[API] Research/Plan Error:', error);
        return new NextResponse(error.message || 'Internal Error', { status: 500 });
    }
}
