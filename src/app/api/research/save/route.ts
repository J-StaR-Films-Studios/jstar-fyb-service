import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { ResearchService } from '@/features/research/services/researchService';
import { SemanticScholarPaper } from '@/features/research/services/semanticScholarService';
import { GroundedWebSource } from '@/features/research/services/geminiService';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { projectId, selectedPapers, selectedWebSources } = body as {
            projectId: string;
            selectedPapers: SemanticScholarPaper[];
            selectedWebSources: GroundedWebSource[];
        };

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        if (!selectedPapers && !selectedWebSources) {
            return NextResponse.json({ error: 'No papers or sources selected' }, { status: 400 });
        }

        // Sentinel: Prevent IDOR
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const isAdmin = (user as { role?: string }).role === 'ADMIN';
        if (project.userId !== user.id && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const savedDocs = await ResearchService.saveSelected(
            projectId,
            selectedPapers || [],
            selectedWebSources || [],
            { autoSync: false } // Client will orchestrate auto-sync
        );

        return NextResponse.json({
            success: true,
            savedCount: savedDocs.length,
            savedDocs,
            message: `Saved ${savedDocs.length} documents to your Research Library`
        });

    } catch (error: any) {
        console.error('[API] Research/Save Error:', error);
        return NextResponse.json({ error: error.message || 'Save failed' }, { status: 500 });
    }
}
