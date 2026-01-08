import { generateDiagramFromImage } from '@/lib/ai/diagramService';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { image, prompt } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const result = await generateDiagramFromImage(image, prompt);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Image generation error:', error);
        return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
    }
}
