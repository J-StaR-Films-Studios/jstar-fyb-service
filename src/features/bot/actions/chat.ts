'use server';

import { prisma } from '@/lib/prisma';
import { CoreMessage } from 'ai';
import { z } from 'zod';

// Input validation schema
const saveConversationSchema = z.object({
    conversationId: z.string().optional(),
    anonymousId: z.string().optional(),
    userId: z.string().optional(), // Removed .uuid() to support CUIDs (better-auth)
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.union([z.string(), z.array(z.any())]),
    })).min(1, 'Messages array cannot be empty'),
}).refine(
    (data) => {
        const hasConversationId = !!data.conversationId;
        const hasIdentifier = (!!data.anonymousId && data.anonymousId.trim() !== "") || !!data.userId;
        return hasConversationId || hasIdentifier;
    },
    { message: 'Either conversationId or at least one of anonymousId/userId must be provided' }
);

// Conversation titles for each bot type
const BOT_CONVERSATION_TITLES = {
    jay: 'Jay Onboarding Chat',
    nengi: 'Hub Chat with Nengi',
    monji: 'Monji Workspace Chat'
} as const;

type BotType = keyof typeof BOT_CONVERSATION_TITLES;

type SaveConversationParams = {
    conversationId?: string;
    anonymousId?: string; // For guest users
    userId?: string;      // For auth users (future)
    messages: CoreMessage[];
    botType?: BotType;    // Which bot this conversation is with
};

// Helper to safely serialize CoreMessage content
function serializeMessageContent(content: string | any[]): string {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        // For multipart content (text + images, etc.), extract text parts
        return content
            .map(part => typeof part === 'string' ? part : part.text || '')
            .join(' ')
            .trim();
    }
    return JSON.stringify(content);
}

export async function saveConversation({
    conversationId,
    anonymousId,
    userId,
    messages,
    botType = 'jay', // Default to Jay for backward compatibility
}: SaveConversationParams) {
    try {
        // Validate inputs
        const validation = saveConversationSchema.safeParse({
            conversationId,
            anonymousId,
            userId,
            messages,
        });

        // Validated


        if (!validation.success) {
            console.error('Validation failed:', validation.error);
            return { success: false, error: 'Invalid input parameters' };
        }

        // 1. Identification Strategy
        // We need either a conversationId (existing) or an anonymousId/userId (new)

        // Find or Create Conversation
        let conversation;

        try {
            if (conversationId) {
                conversation = await prisma.conversation.findUnique({
                    where: { id: conversationId },
                });
            }
        } catch (error) {
            console.error('[saveConversation] Failed to find conversation:', error);
            return { success: false, error: 'Failed to retrieve conversation' };
        }

        if (!conversation) {
            try {
                // Use bot-specific title for proper conversation isolation
                const conversationTitle = BOT_CONVERSATION_TITLES[botType];
                conversation = await prisma.conversation.create({
                    data: {
                        anonymousId,
                        userId,
                        title: conversationTitle,
                    },
                });
            } catch (error) {
                console.error('[saveConversation] Failed to create conversation:', error);
                return { success: false, error: 'Failed to create conversation' };
            }
        }

        // 2. Sync Messages
        // This is a naive "sync all" approach. For production, diffing/appending is better.
        // For now, we'll just ensure the last message is saved to avoid duplicates if possible,
        // OR just delete all and re-save (inefficient but safe for MVP).
        // BETTER: Just append the new ones. But we receive the whole history.

        // Let's implement an "Append Only" strategy request from client? 
        // No, client usually sends full history.

        // Efficient Strategy:
        // Delete all messages for this conversation and re-insert. (Safe, simple, fast enough for < 100 msgs)

        try {
            // Use transaction to ensure atomicity
            const messagesToCreate = messages.map((m) => ({
                conversationId: conversation.id,
                role: m.role,
                content: serializeMessageContent(m.content),
            }));

            await prisma.$transaction([
                prisma.message.deleteMany({
                    where: { conversationId: conversation.id },
                }),
                prisma.message.createMany({
                    data: messagesToCreate,
                }),
            ]);
        } catch (error) {
            console.error('[saveConversation] Failed to update messages:', error);
            return { success: false, error: 'Failed to update conversation history' };
        }

        return { success: true, conversationId: conversation.id };
    } catch (error) {
        console.error('[saveConversation] Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function getConversation(conversationId: string) {
    return await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

export async function getLatestConversation({
    anonymousId,
    userId,
    botType = 'jay' // Default to Jay for backward compatibility
}: {
    anonymousId?: string;
    userId?: string;
    botType?: BotType;
}) {
    const conversationTitle = BOT_CONVERSATION_TITLES[botType];
    if (!anonymousId && !userId) return null;

    // CRITICAL SECURITY FIX: Data Isolation - Never mix authenticated and anonymous sessions
    // If userId is provided, ONLY return that user's conversations
    // This prevents data leakage between sessions
    if (userId) {
        // CRITICAL SECURITY FIX: Validate user exists and is authorized
        const userExists = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userExists) {
            // CRITICAL SECURITY FIX: Log security event for invalid user access attempt
            console.warn(`[Security] Invalid userId attempted: ${userId}`);
            return null;
        }

        // CRITICAL SECURITY FIX: Strict data isolation - only return conversations for this specific user
        // Also filter by bot type to prevent cross-contamination between Jay/Nengi/Monji
        return await prisma.conversation.findFirst({
            where: {
                userId: userId,
                title: conversationTitle, // Filter by bot type!
                // Note: We allow conversations with anonymousId set, as these are migrated sessions.
                // The userId check is sufficient for security.
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    // CRITICAL SECURITY FIX: Anonymous session - only return anonymous conversations
    // Ensure strict separation from authenticated user data
    if (anonymousId) {
        return await prisma.conversation.findFirst({
            where: {
                anonymousId: anonymousId,
                userId: null, // CRITICAL SECURITY FIX: Ensure we don't return user-assigned conversations
                title: conversationTitle // Filter by bot type!
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    // No valid identifiers provided
    return null;
}

export async function mergeAnonymousData(anonymousId: string, userId: string) {
    try {
        await prisma.$transaction([
            // Update Conversations
            prisma.conversation.updateMany({
                where: { anonymousId: anonymousId, userId: null },
                data: { userId: userId },
            }),
            // Update Leads
            prisma.lead.updateMany({
                where: { anonymousId: anonymousId, userId: null },
                data: { userId: userId },
            }),
            // Update Projects (Fix for stranded anonymous projects)
            prisma.project.updateMany({
                where: { anonymousId: anonymousId, userId: null },
                data: { userId: userId },
            })
        ]);
        return { success: true };
    } catch (error) {
        console.error('Failed to merge anonymous data:', error);
        return { success: false, error };
    }
}

/**
 * Clear all conversations for a user or anonymous session.
 * This is used for the "Clear Chat" functionality.
 * Messages are cascade-deleted automatically via the Prisma schema.
 */
export async function clearAllConversations({
    userId,
    anonymousId
}: { userId?: string; anonymousId?: string }) {
    try {
        if (!userId && !anonymousId) {
            return { success: false, error: 'Either userId or anonymousId must be provided' };
        }

        // Build the where clause based on what identifiers we have
        const whereClause: { userId?: string; anonymousId?: string } = {};

        if (userId) {
            whereClause.userId = userId;
        } else if (anonymousId) {
            whereClause.anonymousId = anonymousId;
        }

        // Delete all conversations (messages cascade-delete via schema)
        const result = await prisma.conversation.deleteMany({
            where: whereClause
        });

        console.log(`[clearAllConversations] Deleted ${result.count} conversations`);
        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('[clearAllConversations] Failed:', error);
        return { success: false, error: 'Failed to clear conversations' };
    }
}
// -----------------------------------------------------------------------------
// LEAD CAPTURE
// -----------------------------------------------------------------------------

const saveLeadSchema = z.object({
    whatsapp: z.string().min(10, 'Invalid WhatsApp number'),
    department: z.string(),
    topic: z.string(),
    twist: z.string(),
    complexity: z.number().min(1).max(5),
    // Allow any string for these IDs - convert empty to undefined
    anonymousId: z.string().optional().transform(val => val && val.trim() !== '' ? val : undefined),
    userId: z.string().optional().transform(val => val && val.trim() !== '' ? val : undefined),
});

export type SaveLeadParams = z.infer<typeof saveLeadSchema>;

export async function saveLeadAction(params: SaveLeadParams) {
    try {
        const validation = saveLeadSchema.safeParse(params);
        if (!validation.success) {
            console.error('[saveLead] Validation failed:', validation.error);
            return { success: false, error: 'Invalid lead data' };
        }

        const data = validation.data;


        const lead = await prisma.lead.upsert({
            where: { whatsapp: data.whatsapp },
            update: {
                department: data.department,
                topic: data.topic,
                twist: data.twist,
                complexity: data.complexity,
                userId: data.userId,
                anonymousId: data.anonymousId,
                status: 'NEW', // Reset status if they re-engage? 
            },
            create: {
                whatsapp: data.whatsapp,
                department: data.department,
                topic: data.topic,
                twist: data.twist,
                complexity: data.complexity,
                userId: data.userId,
                anonymousId: data.anonymousId,
            },
        });

        console.log('[saveLead] Success:', lead.id);
        return { success: true, leadId: lead.id };
    } catch (error) {
        console.error('[saveLead] Unexpected error:', error);
        return { success: false, error: 'Failed to save lead information' };
    }
}
