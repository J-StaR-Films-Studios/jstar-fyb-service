import { NextRequest, NextResponse } from 'next/server';
import { generateDiagramCode } from '@/lib/ai/diagramService';
import { applyRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(
      getClientIdentifier(req),
      'ai'
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { prompt, diagramType, context } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateDiagramCode({
      diagramType: diagramType || 'flowchart',
      description: prompt,
      projectContext: context,
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Diagram generation error: ${errorMessage}`, "[GenerateDiagram]");
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
