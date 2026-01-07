import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { z } from 'zod';
import { NENGI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { validateService, getEnv } from '@/lib/env-validation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// 1. Service Validation
if (!validateService('ai')) {
    throw new Error('AI service configuration is missing. Please set GROQ_API_KEY environment variable.');
}

const env = getEnv();
const groq = createGroq({ apiKey: env.GROQ_API_KEY });
export const maxDuration = 120; // 2 minutes max

// 2. Schema Validation (AI SDK v5 format)
const chatSchema = z.object({
    messages: z.array(z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().optional(), // Fallback for older format
        parts: z.array(z.object({
            type: z.string(),
            text: z.string().optional(),
        })).optional(),
    })).min(1),
    conversationId: z.string().optional(),
}).passthrough();

// Helper to extract text content from a message
function getMessageContent(m: any): string {
    if (m.parts && Array.isArray(m.parts)) {
        return m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('');
    }
    return m.content || '';
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            console.error('[Hub Chat] Validation error:', JSON.stringify(validation.error.format(), null, 2));
            return new Response(JSON.stringify({ error: 'Invalid input', details: validation.error }), { status: 400 });
        }

        const { messages, conversationId } = validation.data;

        // 3. Fetch User Context (Active Projects)
        const projects = await prisma.project.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                topic: true,
                status: true,
                department: true,
                progressPercentage: true
            },
            take: 5,
            orderBy: { updatedAt: 'desc' }
        });

        // 4. Construct System Prompt with Context
        const projectContext = projects.length > 0
            ? projects.map(p => `- "${p.topic}" (${p.department || 'No Dept'}, ${p.progressPercentage}% done)`).join('\n')
            : "No active projects yet.";

        const systemPrompt = `${NENGI_SYSTEM_PROMPT}

USER CONTEXT:
- Name: ${user.name}
- Active Projects:
${projectContext}
`;

        // 5. Persist Conversation (User Level)
        let activeConvId = conversationId;
        if (!activeConvId) {
            // Find existing Nengi conversation or create new one
            const existingConv = await prisma.conversation.findFirst({
                where: {
                    userId: user.id,
                    title: "Hub Chat with Nengi"
                },
                orderBy: { updatedAt: 'desc' }
            });

            if (existingConv) {
                activeConvId = existingConv.id;
            } else {
                const conv = await prisma.conversation.create({
                    data: {
                        userId: user.id,
                        title: "Hub Chat with Nengi"
                    }
                });
                activeConvId = conv.id;
            }
        }

        // 6. Stream Response
        const result = streamText({
            model: groq('llama-3.3-70b-versatile'), // Good balance of creative/smart
            system: systemPrompt,
            messages: messages.map((m: any) => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: getMessageContent(m)
            })) as any,
            onFinish: async ({ text }: { text: string }) => {
                // Save messages to DB
                if (activeConvId) {
                    const lastUserContent = getMessageContent(messages[messages.length - 1]);
                    await prisma.$transaction([
                        prisma.message.create({
                            data: {
                                conversationId: activeConvId,
                                role: 'user',
                                content: lastUserContent
                            }
                        }),
                        prisma.message.create({
                            data: {
                                conversationId: activeConvId,
                                role: 'assistant',
                                content: text
                            }
                        })
                    ]);
                }
            }
        } as any);

        return result.toUIMessageStreamResponse();

    } catch (error: any) {
        console.error('[Hub Chat API] Error:', error);
        return new Response(JSON.stringify({ error: 'Nengi is taking a nap. Try again later.' }), { status: 500 });
    }
}

// GET: Fetch existing conversation history
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Find existing Nengi conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                userId: user.id,
                title: "Hub Chat with Nengi"
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 100
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!conversation) {
            return Response.json({ conversationId: null, messages: [] });
        }

        // Get user's projects for context-aware first message
        const projects = await prisma.project.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                topic: true,
                progressPercentage: true
            },
            take: 3,
            orderBy: { updatedAt: 'desc' }
        });

        return Response.json({
            conversationId: conversation.id,
            messages: conversation.messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content
            })),
            projects
        });

    } catch (error: any) {
        console.error('[Hub Chat GET] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch conversation' }), { status: 500 });
    }
}

// DELETE: Clear conversation history
export async function DELETE() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Find and delete existing Nengi conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                userId: user.id,
                title: "Hub Chat with Nengi"
            }
        });

        if (conversation) {
            // Delete messages first, then conversation
            await prisma.message.deleteMany({
                where: { conversationId: conversation.id }
            });
            await prisma.conversation.delete({
                where: { id: conversation.id }
            });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        console.error('[Hub Chat DELETE] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), { status: 500 });
    }
}
