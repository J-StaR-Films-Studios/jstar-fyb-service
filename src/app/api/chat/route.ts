import { convertToModelMessages, streamText, stepCountIs } from 'ai';
import { z } from 'zod';
import { SYSTEM_PROMPT, buildJayPrompt } from '@/features/bot/prompts/system';
import { validateService, getEnv } from '@/lib/env-validation';
import { sanitizeInput, MAX_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH as MAX_MSG_LEN_EXPORT } from '@/features/bot/utils/security';
import { chatTools } from '@/features/bot/tools/definitions';
import { selectModel } from '@/lib/ai/router';
import { Models } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';

// Validate AI service configuration at startup
// We keep this check but make it non-blocking if other providers are available
// For now, we assume at least one provider is needed.
try {
    validateService('ai');
} catch (e) {
    logger.warn('Groq AI service not fully configured, falling back to router logic.', '[Chat API]');
}

// Get validated environment variables
const env = getEnv();

// Allow streaming responses up to 120 seconds
export const maxDuration = 120;
const MAX_MESSAGES = 50; // Limit history size per request

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
    modelOverride: z.string().optional(),
    quality: z.string().optional(),
    // Context fields for Jay
    tierContext: z.string().optional(),
    existingTopic: z.string().optional(),
    userName: z.string().optional(),
}).passthrough();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            logger.error(validation.error.format(), '[Chat API] Validation failed');
            return new Response(JSON.stringify({ error: 'Invalid input', details: validation.error }), { status: 400 });
        }

        const { messages, modelOverride, quality, tierContext, existingTopic, userName } = validation.data;

        // Defensive check
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
        }

        // Build dynamic system prompt based on context
        const dynamicSystemPrompt = buildJayPrompt({
            tier: tierContext,
            existingTopic: existingTopic,
            userName: userName
        });

        // Convert to CoreMessage[] format (Vercel AI SDK v6)
        const coreMessages = (messages as any).length > 0 ? await convertToModelMessages(messages as any) : [];

        // Sanitize user content while preserving structure
        const modelMessages = coreMessages.map(m => {
            if (m.role === 'user') {
                if (typeof m.content === 'string') {
                    return { ...m, content: sanitizeInput(m.content) };
                }
                if (Array.isArray(m.content)) {
                    return {
                        ...m,
                        content: m.content.map(p => {
                            if (p.type === 'text') {
                                return { ...p, text: sanitizeInput(p.text) };
                            }
                            return p;
                        })
                    };
                }
            }
            return m;
        });

        // Debug Log
        logger.info(`Processing ${modelMessages.length} messages.`, '[Chat API]');

        // Select model using Router
        const { model: selectedModel, modelId } = selectModel({
            quality: (quality as any) || 'standard',
            // Default to Kimi K2 for Jay, unless override is present (Retry)
            forceModel: modelOverride || Models.GROQ.KIMI_K2_0905,
            tools: true,
        });

        logger.info(`Using model: ${modelId}`, '[Chat API]');

        const result = streamText({
            model: selectedModel,
            maxRetries: 3,
            stopWhen: stepCountIs(5),
            system: dynamicSystemPrompt,
            messages: modelMessages as any,
            tools: chatTools as any,
            onFinish: async ({ text, toolCalls }: { text: string; toolCalls: any[] }) => {
                // Client-side persistence via useChatFlow
            },
        } as any);

        return result.toUIMessageStreamResponse();

    } catch (error: any) {
        logger.error(error, '[Chat API] Fatal error after retries');

        // Standardized recovery for tool errors
        const errorMessage = error?.message || '';
        const isToolCallError = ['tool call validation failed', 'Failed to call a function', 'did not match schema']
            .some(msg => errorMessage.includes(msg));

        if (isToolCallError) {
            logger.warn('Tool call failed, returning recovery message', '[Chat API]');
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
        logger.error(error, '[Chat DELETE]');
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), { status: 500 });
    }
}
