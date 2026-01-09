import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from 'crypto';
import { validateService, getEnv } from "@/lib/env-validation";

// Validate payment service configuration
if (!validateService('payment')) {
    throw new Error('Payment service configuration is missing. Please set PAYSTACK_SECRET_KEY environment variable.');
}

const env = getEnv();
const PAYSTACK_SECRET = env.PAYSTACK_SECRET_KEY;
const APP_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface InitializePaymentParams {
    email: string;
    amount: number; // in Naira (will be converted to kobo)
    reference: string;
    callbackUrl?: string;
    metadata?: any;
}

export const PaystackService = {
    async initializePayment({ email, amount, reference, callbackUrl, metadata }: InitializePaymentParams) {
        if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY is missing");

        const params = {
            email,
            amount: amount * 100, // Convert to kobo
            reference,
            callback_url: callbackUrl || `${APP_URL}/project/builder`,
            metadata: JSON.stringify(metadata || {}),
        };

        const res = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        const data = await res.json();

        if (!res.ok || !data.status) {
            console.error('[PaystackService] Init failed:', data);
            throw new Error(data.message || 'Payment initialization failed');
        }

        return {
            authorizationUrl: data.data.authorization_url,
            accessCode: data.data.access_code,
            reference: data.data.reference,
        };
    },

    async verifyPayment(reference: string) {
        if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY is missing");

        const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
            },
        });

        const data = await res.json();

        if (!res.ok || !data.status) {
            return { success: false, data: null };
        }

        // Return the full transaction data
        return { success: true, data: data.data };
    },

    verifyWebhookSignature(body: string, signature: string): boolean {
        if (!PAYSTACK_SECRET) return false;
        const hash = createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex');

        try {
            const hashBuffer = Buffer.from(hash);
            const signatureBuffer = Buffer.from(signature);

            // Prevent timing attacks by checking length first, then using timingSafeEqual
            if (hashBuffer.length !== signatureBuffer.length) {
                return false;
            }

            return timingSafeEqual(hashBuffer, signatureBuffer);
        } catch (error) {
            // Handle potential Buffer creation errors (though unlikely with hex strings)
            console.error('[PaystackService] Signature verification error:', error);
            return false;
        }
    }
};
