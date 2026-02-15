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
    const { projectId, queries, deepGoal } = body;

    if (!projectId) {
      return new NextResponse('Project ID required', { status: 400 });
    }

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return new NextResponse('Queries array required', { status: 400 });
    }

    if (!deepGoal) {
      return new NextResponse('Deep goal (research topic) required', { status: 400 });
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
        const sendUpdate = (step: string, message: string, details?: any) => {
          const data = JSON.stringify({ step, message, details });
          controller.enqueue(encoder.encode(data + '\n'));
        };

        const onProgress = (p: ResearchProgress) => {
          sendUpdate(p.step, p.message, p.details);
        };

        try {
          await ResearchService.executeHybridResearch(projectId, queries, deepGoal, onProgress);
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
