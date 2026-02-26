import { generateDiagramFromImage } from '@/lib/ai/diagramService';
import { NextResponse } from 'next/server';
import { applyRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(
            getClientIdentifier(req),
            'ai'
        );
        if (rateLimitResponse) return rateLimitResponse;

        const { image, prompt } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const result = await generateDiagramFromImage(image, prompt);
        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Image generation error: ${errorMessage}`, "[DiagramFromImage]");
        return NextResponse.json({ error: errorMessage || 'Processing failed' }, { status: 500 });
    }
}
