import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';

// Use Groq with Llama for fast enhancement
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqApiKey,
});

export const maxDuration = 60;

const enhanceTypes = {
    clarity: {
        name: 'Improve Clarity',
        prompt: 'Rewrite to be clearer, more concise, and easier to follow. Maintain academic tone.',
    },
    academic: {
        name: 'Academic Polish',
        prompt: 'Enhance academic rigour. Add formal transitions, improve vocabulary, strengthen arguments.',
    },
    expand: {
        name: 'Expand Content',
        prompt: 'Expand with more detail, examples, and deeper analysis. Maintain coherence with surrounding context.',
    },
    shorten: {
        name: 'Shorten & Condense',
        prompt: 'Condense to key points only. Remove redundancy but preserve essential meaning.',
    },
} as const;

const requestSchema = z.object({
    sectionContent: z.string().min(1, 'Content is required'),
    enhanceType: z.enum(['clarity', 'academic', 'expand', 'shorten']),
    chapterContext: z.string().optional(),
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { id: projectId, chapterNumber } = await params;
        const body = await req.json();
        const validation = requestSchema.safeParse(body);

        if (!validation.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid input', details: validation.error.issues }),
                { status: 400 }
            );
        }

        const { sectionContent, enhanceType, chapterContext } = validation.data;
        const enhanceConfig = enhanceTypes[enhanceType];

        const systemPrompt = `You are an expert academic editor specializing in Final Year Project documentation.
Your task is to ${enhanceConfig.prompt}

RULES:
1. ONLY return the improved text - no explanations, preambles, or meta-commentary.
2. Maintain British English (UK) spelling.
3. Preserve any existing citations (Author, Year) format.
4. Keep Markdown formatting (##, ###, **bold**, etc.)
5. Do NOT add section headings unless they already exist.

${chapterContext ? `CHAPTER CONTEXT (for reference):\n${chapterContext.substring(0, 500)}...` : ''}`;

        const result = streamText({
            model: groq('llama-3.3-70b-versatile'),
            system: systemPrompt,
            prompt: `ORIGINAL TEXT:\n\n${sectionContent}\n\nGenerate the enhanced version now:`,
        });

        return result.toTextStreamResponse();

    } catch (error: unknown) {
        console.error('[Enhance API] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Enhancement failed' }),
            { status: 500 }
        );
    }
}
