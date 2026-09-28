import { NextRequest, NextResponse } from 'next/server';
import { extractTopicFromConversation } from '@/features/bot/services/topicExtractor';
import { z } from 'zod';
import { applyAnonymousAiRateLimit } from '@/lib/rate-limit';
import { MAX_MESSAGE_LENGTH } from '@/features/bot/utils/security';

const requestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(MAX_MESSAGE_LENGTH),
    })).min(1).max(15),
});

export async function POST(req: NextRequest) {
    try {
        const rateLimitResponse = await applyAnonymousAiRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await req.json();
        const validation = requestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const extracted = await extractTopicFromConversation(validation.data.messages);

        if (!extracted) {
            return NextResponse.json({
                topic: 'Project Topic',
                twist: 'Unique Approach',
                department: 'Computer Science',
                complexity: 3,
            });
        }

        return NextResponse.json(extracted);
    } catch (error) {
        console.error('[ExtractTopic API] Error:', error);
        return NextResponse.json({
            topic: 'Project Topic',
            twist: 'Unique Approach',
            department: 'Computer Science',
            complexity: 3,
        });
    }
}
