/**
 * Chat Request Validation Schemas
 * 
 * Zod schemas for validating chat API request bodies.
 * Ensures messages array and related fields are properly formatted.
 * 
 * @module lib/validation/chat
 */

import { z } from 'zod';

// ============================================================
// Message Content Schemas
// ============================================================

/**
 * Schema for message content parts (used in multi-part messages)
 */
const MessagePartSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
}).passthrough(); // Allow extra properties for tool parts, reasoning, etc.

/**
 * Schema for message content - can be a string or an array of parts
 */
const MessageContentSchema = z.union([
    z.string().min(1, 'Message content cannot be empty'),
    z.array(MessagePartSchema).min(1, 'Message parts cannot be empty'),
]);

// ============================================================
// Message Schema
// ============================================================

/**
 * Schema for a single chat message
 */
const MessageSchema = z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']),
    content: MessageContentSchema.optional(),
    parts: z.array(MessagePartSchema).optional(),
}).refine(
    (data) => data.content || data.parts,
    { message: 'Message must have either content or parts' }
);

// ============================================================
// Context Scope Schema
// ============================================================

/**
 * Schema for optional context scope parameters
 */
const ContextScopeSchema = z.object({
    chapterNumbers: z.array(z.number().int().positive()).optional(),
    includeResearch: z.boolean().optional(),
}).optional();

// ============================================================
// Chat Request Schema
// ============================================================

/**
 * Main schema for chat request validation
 */
export const ChatRequestSchema = z.object({
    messages: z.array(MessageSchema).min(1, 'At least one message is required'),
    threadId: z.string().nullable().optional(),
    contextScope: ContextScopeSchema,
});

// ============================================================
// Types
// ============================================================

/**
 * Inferred type from the chat request schema
 */
export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================
// Validation Function
// ============================================================

/**
 * Validates a chat request body against the schema
 * 
 * @param body - The raw request body to validate
 * @returns Success with validated data, or failure with error message
 * 
 * @example
 * const validation = validateChatRequest(body);
 * if (!validation.success) {
 *   return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
 * }
 * const { messages, threadId, contextScope } = validation.data;
 */
export function validateChatRequest(body: unknown):
    | { success: true; data: ValidatedChatRequest }
    | { success: false; error: string } {
    try {
        const data = ChatRequestSchema.parse(body);
        return { success: true, data };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
            return { success: false, error: messages.join('; ') };
        }
        return { success: false, error: 'Invalid request format' };
    }
}
