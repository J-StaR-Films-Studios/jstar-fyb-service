import { streamObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { outlineSchema } from '@/features/builder/schemas/outlineSchema';
import { z } from 'zod';
import { BuilderAiService } from '@/features/builder/services/builderAiService';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// Validate environment variables
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqApiKey,
});

export const maxDuration = 120;

// Input validation schema
const requestSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
    abstract: z.string().min(1, 'Abstract is required'),
    projectId: z.string().optional(), // Client may pass existing project ID
});

export async function POST(req: Request) {
    const body = await req.json();

    // Validate input
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: 'Invalid input', details: validation.error.issues }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { topic, abstract, projectId: clientProjectId } = validation.data;

    // Attempt to get context from similar projects (graceful fallback if it fails)
    let contextLine = '';
    try {
        const outlineTopics = await BuilderAiService.generateOutline(topic);
        if (outlineTopics.length > 0) {
            contextLine = `\nContext from similar projects: ${outlineTopics.join(', ')}\nUse the context from similar projects to make the outline more relevant and data-driven.`;
        }
    } catch (serviceError) {
        console.warn('[GenerateOutline] BuilderAiService failed, proceeding without context:', serviceError);
    }

    // Check for authenticated user context before streaming
    const user = await getCurrentUser();

    const result = streamObject({
        model: groq('openai/gpt-oss-120b'),
        schema: outlineSchema,
        system: `You are an expert academic curriculum designer.
Create a 5-chapter distinction-grade project outline based on the verified abstract.

Topic: ${topic}
Abstract: ${abstract}
${contextLine}

The chapters should strictly follow standard structure:
1. Introduction
2. Literature Review
3. Methodology
4. Implementation/Results
5. Conclusion/Evaluation

Ensure the content descriptions are specific to the project's domain (e.g., if blockchain, mention consensus algorithms; if AI, mention model training).`,
        prompt: "Generate the project outline structure.",
        onFinish: async ({ object: outlineData }) => {
            // Store the outline in the database asynchronously
            if (outlineData?.chapters) {
                try {
                    if (user) {
                        // PRIORITY 1: Use projectId from client if provided
                        let project = clientProjectId
                            ? await prisma.project.findUnique({
                                where: { id: clientProjectId }
                            })
                            : null;

                        // PRIORITY 2: Fall back to topic-based lookup (legacy behavior)
                        if (!project) {
                            project = await prisma.project.findFirst({
                                where: {
                                    topic: topic,
                                    userId: user.id
                                }
                            });
                        }

                        // PRIORITY 3: Create new project only if nothing found
                        if (!project) {
                            console.log('[GenerateOutline] No existing project found, creating new one');
                            // Use ProjectsService to enforce lock
                            const { ProjectsService } = await import('@/services/projects.service');
                            project = await ProjectsService.createProject({
                                topic,
                                abstract,
                                userId: user.id
                            });
                        }

                        // CRITICAL FIX: Normalize to array (streaming can return object with numeric keys)
                        const rawChapters = outlineData.chapters;
                        const chaptersArray = Array.isArray(rawChapters)
                            ? rawChapters
                            : Object.values(rawChapters);

                        // Create or update the chapter outline
                        await prisma.chapterOutline.upsert({
                            where: { projectId: project.id },
                            update: {
                                content: JSON.stringify(chaptersArray),
                                updatedAt: new Date()
                            },
                            create: {
                                projectId: project.id,
                                content: JSON.stringify(chaptersArray)
                            }
                        });
                    }
                } catch (dbError) {
                    console.error('[GenerateOutline] Failed to store outline in database:', dbError);
                }
            }
        }
    });

    return result.toTextStreamResponse();
}
