import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { ResearchService, ResearchProgress } from '@/features/research/services/researchService';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { projectId, mode, queries, deepGoal } = body;

        if (!projectId || !mode) {
            return new NextResponse('Project ID and Mode required', { status: 400 });
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

        // Create Streaming Response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (step: string, message: string) => {
                    const data = JSON.stringify({ step, message });
                    controller.enqueue(encoder.encode(data + '\n'));
                };

                const onProgress = (p: ResearchProgress) => {
                    sendUpdate(p.step, p.message);
                };

                try {
                    if (mode === 'deep') {
                        if (!deepGoal) throw new Error('Deep Research requires a "deepGoal" (research topic).');
                        await ResearchService.executeDeepResearch(projectId, deepGoal, onProgress);
                    } else {
                        // Standard Mode
                        if (!queries || !Array.isArray(queries) || queries.length === 0) {
                            throw new Error('Standard Research requires a list of "queries".');
                        }
                        await ResearchService.executeStandardResearch(projectId, queries, onProgress);
                    }
                } catch (error: any) {
                    sendUpdate('failed', error.message || 'Execution failed');
                } finally {
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('[API] Research/Execute Error:', error);
        return new NextResponse(error.message || 'Internal Error', { status: 500 });
    }
}
