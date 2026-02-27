import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { BuilderAiService } from '@/features/builder/services/builderAiService';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { applyRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqApiKey,
});

export const maxDuration = 120;

const requestSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
    twist: z.string().optional(),
    instruction: z.string().optional()
});

export async function POST(req: Request) {
    const user = await getCurrentUser();
    const identifier = user?.id || getClientIdentifier(req);
    const rateLimitResponse = await applyRateLimit(identifier, 'ai');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();

    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: 'Invalid input', details: validation.error }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { topic, twist, instruction } = validation.data;

    let contextLine = '';
    try {
        const abstractContent = await BuilderAiService.generateAbstract(topic);
        if (abstractContent) {
            contextLine = `\nContext from similar projects: ${abstractContent}\nUse the context from similar projects to make the abstract more relevant and data-driven.`;
        }
    } catch (serviceError) {
        logger.warn('BuilderAiService failed, proceeding without context', "[GenerateAbstract]");
    }

    const systemPrompt = `You are an expert academic research consultant.
Your goal is to write a compelling, technically sound project abstract.

Topic: ${topic}
${twist ? `Unique Twist/Approach: ${twist}` : ''}
${contextLine}

Style: Academic yet accessible, distinction-grade quality.
Format: 2-3 paragraphs of flowing prose only.

IMPORTANT:
- Do NOT include a title or heading like "Abstract" or "**Abstract**" at the start.
- Start directly with the content (e.g., "Modern libraries face..." or "This study proposes...")
- Do NOT use markdown formatting like ** or # in the output.

Structure:
1. Context/Problem Statement
2. The Proposed Solution (incorporating the twist)
3. Methodology & Expected Outcomes

${instruction ? `REFINEMENT INSTRUCTION: ${instruction}` : ''}`;

    const result = streamText({
        model: groq('openai/gpt-oss-120b'),
        system: systemPrompt,
        prompt: `Write the abstract for "${topic}".`,
    });

    const abstractText = await result.text;
    if (abstractText) {
        try {
            if (user) {
                const existingProject = await prisma.project.findFirst({
                    where: {
                        topic: topic,
                        userId: user.id
                    }
                });

                if (existingProject) {
                    await prisma.project.update({
                        where: { id: existingProject.id },
                        data: {
                            twist: twist,
                            abstract: abstractText,
                            updatedAt: new Date()
                        }
                    });
                }
            }
        } catch (dbError) {
            logger.error('Failed to store abstract in database', "[GenerateAbstract]");
        }
    }

    return result.toTextStreamResponse();
}
