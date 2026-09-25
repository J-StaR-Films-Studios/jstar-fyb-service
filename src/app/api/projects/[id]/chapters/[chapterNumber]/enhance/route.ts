import { streamText } from 'ai';
import { selectModel } from '@/lib/ai/router';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

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

        const { id: projectId } = await params;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true },
        });
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        if (project.userId !== user.id) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        const rateLimitResponse = await applyRateLimit(user.id, 'ai', { failClosed: true });
        if (rateLimitResponse) return rateLimitResponse;

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

STRICT WRITING GUIDELINES (per UNIVERSAL RESEARCH PAPER PROMPT):
1. **Tone**: Maintain a formal, objective, and academic tone. Avoid colloquialisms.
2. **Citations**: Use ONLY (Author, Year) format (e.g., "(Smith, 2021)"). NEVER include paper titles in citations.
3. **Plagiarism**: If the content references external sources, rewrite to ensure originality while preserving the citation.
4. **Tense**:
   - Methodology/Results sections: Use PAST tense (e.g., "The model achieved...", "Data passed...").
   - Introduction/Discussion/Conclusion: Use PRESENT tense for established facts and PAST for specific study results.
5. **Spelling**: Use British English (UK).
6. **Formatting**: Keep Markdown (##, **bold**) but do not add new headings unless necessary.

OUTPUT RULES:
1. ONLY return the improved text - no conversational filler.
2. Do NOT add markers like "Here is the improved text:".

${chapterContext ? `CHAPTER CONTEXT (for reference):\n${chapterContext.substring(0, 500)}...` : ''}`;

        const { model, providerOptions } = selectModel({ effort: 'medium' });
        const result = streamText({
            model,
            providerOptions,
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
