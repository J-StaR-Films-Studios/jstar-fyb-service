'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const LeadSchema = z.object({
    whatsapp: z.string().regex(/^\d{10,15}$/, "Invalid WhatsApp number: must be 10-15 digits"),
    department: z.string(),
    topic: z.string(),
    twist: z.string(),
    complexity: z.number().min(1).max(5),
});

export type LeadData = z.infer<typeof LeadSchema>;

export async function captureLead(data: LeadData) {
    try {
        const validated = LeadSchema.parse(data);

        // Get anonymous ID from cookies
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const anonymousId = cookieStore.get('anonymous_id')?.value;

        // Atomic Upsert: If exists, do nothing (return it), else create.
        const lead = await prisma.lead.upsert({
            where: { whatsapp: validated.whatsapp },
            update: {
                // If we have an anonymousId now but didn't before, update it?
                // For now, let's just update anonymousId if it's missing
                anonymousId: anonymousId ? anonymousId : undefined
            },
            create: {
                whatsapp: validated.whatsapp,
                department: validated.department,
                topic: validated.topic,
                twist: validated.twist,
                complexity: validated.complexity,
                anonymousId: anonymousId,
                status: "NEW"
            }
        });

        logger.info(`✅ Lead Captured (ID: ${lead.id})`);
        return { success: true, id: lead.id };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to capture lead: ${errorMessage}`);
        return { success: false, error: "Failed to save lead" };
    }
}
