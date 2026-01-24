import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PaystackService } from '@/services/paystack.service';
import { BillingService, PaymentData } from '@/services/billing.service';
import { logger } from '@/lib/logger';

// Zod schema for Paystack webhook events
const paystackEventSchema = z.object({
    event: z.string(),
    data: z.object({
        reference: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        paid_at: z.string(),
        channel: z.string(),
        metadata: z.object({
            projectId: z.string().optional()
        }).passthrough().optional(),
        customer: z.object({
            email: z.string().email()
        }).passthrough()
    }).passthrough()
});

export async function POST(req: NextRequest) {
    try {
        // 1. Get signature and body
        const signature = req.headers.get('x-paystack-signature');
        if (!signature) {
            return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
        }

        const bodyText = await req.text();

        // 2. Verify signature
        if (!PaystackService.verifyWebhookSignature(bodyText, signature)) {
            logger.error('[Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 3. Parse and validate with Zod
        let parsedBody: unknown;
        try {
            parsedBody = JSON.parse(bodyText);
        } catch {
            logger.error('[Webhook] Invalid JSON body');
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const validationResult = paystackEventSchema.safeParse(parsedBody);
        if (!validationResult.success) {
            logger.error('[Webhook] Invalid event schema:', JSON.stringify(validationResult.error.flatten()));
            return NextResponse.json({ error: 'Invalid payload schema' }, { status: 400 });
        }

        const event = validationResult.data;
        logger.info(`[Webhook] Received event: ${event.event}`, event.data.reference);

        // 3. Handle events
        switch (event.event) {
            case 'charge.success':
                await BillingService.recordPayment(event.data as PaymentData);
                break;

            case 'transfer.success':
                // Optional: Handle transfers if we implement refunds or payouts
                logger.info('[Webhook] Transfer success:', JSON.stringify(event.data));
                break;

            case 'subscription.create':
                // Optional: Handle value-added subscriptions if added later
                logger.info('[Webhook] Subscription created:', JSON.stringify(event.data));
                break;

            default:
                logger.info(`[Webhook] Unhandled event type: ${event.event}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: unknown) {
        // Secure error handling: Log the specific error server-side, but return a generic message to the client
        const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
        logger.error('[Webhook] Error processing event:', errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
