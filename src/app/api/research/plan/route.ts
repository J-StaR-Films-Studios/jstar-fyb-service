import { NextRequest, NextResponse } from 'next/server';
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

        // Generate Plan
        const plan = await ResearchService.generateResearchPlan(projectId);

        return NextResponse.json(plan);

    } catch (error: any) {
        console.error('[API] Research/Plan Error:', error);
        return new NextResponse(error.message || 'Internal Error', { status: 500 });
    }
}
