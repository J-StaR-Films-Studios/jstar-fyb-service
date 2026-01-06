import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { BuilderAiService } from '@/features/builder/services/builderAiService';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// Validate environment variables
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

// Create Groq provider using OpenAI SDK compatibility
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
    const body = await req.json();

    // Validate input
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: 'Invalid input', details: validation.error }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { topic, twist, instruction } = validation.data;

    // Attempt to get context from similar projects (graceful fallback if it fails)
    let contextLine = '';
    try {
        const abstractContent = await BuilderAiService.generateAbstract(topic);
        if (abstractContent) {
            contextLine = `\nContext from similar projects: ${abstractContent}\nUse the context from similar projects to make the abstract more relevant and data-driven.`;
        }
    } catch (serviceError) {
        console.warn('[GenerateAbstract] BuilderAiService failed, proceeding without context:', serviceError);
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

    // Store the abstract in the database IF there's an existing project
    // NOTE: We don't CREATE projects here - that's handled by createProjectAction
    // We only UPDATE existing projects to avoid title conflicts
    const abstractText = await result.text;
    if (abstractText) {
        try {
            const user = await getCurrentUser();
            if (user) {
                // Only update existing project - don't create new ones
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
                // If no existing project, the abstract will be saved when user clicks "Confirm & Generate"
            }
        } catch (dbError) {
            console.error('[GenerateAbstract] Failed to store abstract in database:', dbError);
            // Continue with the response even if database storage fails
        }
    }

    return result.toTextStreamResponse();
}
