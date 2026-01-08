import { NextRequest, NextResponse } from 'next/server';
import { generateDiagramCode } from '@/lib/ai/diagramService';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { prompt, diagramType, context } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Use shared diagram generation service
    const result = await generateDiagramCode({
      diagramType: diagramType || 'flowchart',
      description: prompt,
      projectContext: context,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Diagram generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
