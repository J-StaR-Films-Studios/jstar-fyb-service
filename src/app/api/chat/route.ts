import { createGroq } from '@ai-sdk/groq';
import { streamText, stepCountIs } from 'ai';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { validateService, getEnv } from '@/lib/env-validation';
import { validateAndSanitizeMessage, MAX_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH as MAX_MSG_LEN_EXPORT } from '@/features/bot/utils/security';
import { chatTools } from '@/features/bot/tools/definitions';

// Validate AI service configuration at startup
if (!validateService('ai')) {
    throw new Error('AI service configuration is missing. Please set GROQ_API_KEY environment variable.');
}

// Get validated environment variables
const env = getEnv();

// Create Groq provider
const groq = createGroq({
    apiKey: env.GROQ_API_KEY,
});

// Allow streaming responses up to 120 seconds
export const maxDuration = 120;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_MESSAGES = 50; // Limit history size per request

// Helper to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for streamText
async function streamTextWithRetry(
    config: Parameters<typeof streamText>[0],
    retries = MAX_RETRIES
): Promise<ReturnType<typeof streamText>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await streamText(config);
        } catch (error) {
            lastError = error as Error;
            console.error(`[Chat API] Attempt ${attempt}/${retries} failed:`, error);
            if (attempt < retries) {
                const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`[Chat API] Retrying in ${waitTime}ms...`);
                await delay(waitTime);
            }
        }
    }
    throw lastError || new Error('All retry attempts failed');
}

// AI SDK v5 message format validation
const chatSchema = z.object({
    messages: z.array(z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
        parts: z.array(z.any()).optional(),
    })).min(1).max(MAX_MESSAGES),
    conversationId: z.string().uuid().optional(),
    anonymousId: z.string().optional(),
    userId: z.string().uuid().optional(),
    id: z.string().optional(),
    trigger: z.string().optional(),
}).passthrough();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            console.error('[Chat API] Validation failed:', JSON.stringify(validation.error.format(), null, 2));
            return new Response(JSON.stringify({ error: 'Invalid input', details: validation.error }), { status: 400 });
        }

        const { messages } = validation.data;

        // Defensive check
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
        }

        // Safely convert messages to model format with sanitization
        const modelMessages = messages.map((m: any) => {
            const textContent = validateAndSanitizeMessage(m);
            return {
                role: m.role as 'user' | 'assistant' | 'system',
                content: textContent
            };
        }).filter((m: any) => m.content && m.content.trim() !== '');

        // Debug Log
        console.log(`[Chat API] Processing ${modelMessages.length} messages. Last: "${modelMessages[modelMessages.length - 1]?.content?.slice(0, 50)}..."`);

        const result = await streamTextWithRetry({
            model: groq('moonshotai/kimi-k2-instruct-0905'), // Llama 3.3 70B equivalent
            stopWhen: stepCountIs(5),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            // Use extracted tools
            tools: chatTools,
            onFinish: async ({ text, toolCalls }) => {
                // Client-side persistence via useChatFlow
            },
        });

        return result.toUIMessageStreamResponse();

    } catch (error: any) {
        console.error('[Chat API] Fatal error after retries:', error);

        // Standardized recovery for tool errors
        const errorMessage = error?.message || '';
        const isToolCallError = ['tool call validation failed', 'Failed to call a function', 'did not match schema']
            .some(msg => errorMessage.includes(msg));

        if (isToolCallError) {
            console.warn('[Chat API] Tool call failed, returning recovery message');
            const recoveryText = "Oops! I got a bit confused there. Let me try again — could you repeat what you'd like to do? If you've already shared your WhatsApp, you can click \"Proceed to Builder\" below to continue!";
            return new Response(JSON.stringify({ error: recoveryText, recoverable: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Jay is currently offline (System Overload). Please try again.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// DELETE: Clear Jay's conversation history for the user
export async function DELETE() {
    try {
        // For Jay, we just need to return success - the client will reset state
        // Jay's messages are stored via anonymous tokens, not user-linked DB records
        // The client handles clearing localStorage/state on its own
        return Response.json({ success: true });
    } catch (error: any) {
        console.error('[Chat DELETE] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), { status: 500 });
    }
}
