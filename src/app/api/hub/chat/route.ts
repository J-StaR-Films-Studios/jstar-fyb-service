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
            // Check if there's a recent open conversation or create new
            // For Nengi, we might just want one main persistent thread per user for now, 
            // but let's stick to standard flow: create new if none passed.
            const conv = await prisma.conversation.create({
                data: {
                    userId: user.id,
                    title: "Hub Chat with Nengi"
                }
            });
            activeConvId = conv.id;
        }

        // 6. Stream Response
        const result = await streamText({
            model: groq('llama-3.3-70b-versatile'), // Good balance of creative/smart
            system: systemPrompt,
            messages: messages.map((m: any) => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: getMessageContent(m)
            })),
            onFinish: async ({ text }) => {
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
        });

        return result.toUIMessageStreamResponse();

    } catch (error: any) {
        console.error('[Hub Chat API] Error:', error);
        return new Response(JSON.stringify({ error: 'Nengi is taking a nap. Try again later.' }), { status: 500 });
    }
}
