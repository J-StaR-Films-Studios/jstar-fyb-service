import { prisma } from "@/lib/prisma";
import { getTierByPrice } from "@/config/pricing";
import { EmailService } from "@/services/email.service";
import { ProjectsService } from "./projects.service";

export interface PaymentData {
    reference: string;
    amount: number; // In kobo
    currency: string;
    channel: string;
    status: string;
    paid_at: string;
    metadata?: {
        projectId?: string; // We expect projectId in metadata
        [key: string]: any;
    };
    customer: {
        email: string;
        [key: string]: any;
    };
}

export const BillingService = {
    /**
     * Record a successful payment and unlock the associated project
     */
    async recordPayment(data: PaymentData) {
        const projectId = data.metadata?.projectId;

        if (!projectId) {
            console.error('[BillingService] No projectId found in payment metadata', data.reference);
            // We might still want to record the payment, but we can't link it to a project easily without the ID.
            // For now, let's try to find the project by other means or just record it with a null project if the schema allowed (it doesn't).
            // Schema requires projectId on Payment. If it's missing, we have a problem.
            throw new Error(`Missing projectId in metadata for reference: ${data.reference}`);
        }

        // 1. Check if payment already exists (Idempotency)
        const existingPayment = await prisma.payment.findUnique({
            where: { reference: data.reference }
        });

        if (existingPayment) {
            console.log(`[BillingService] Payment already recorded: ${data.reference}`);
            return existingPayment;
        }

        // 2. Find the user (or effectively rely on the one linked to the project if strictly needed, 
        // but Paystack gives us the email. Safe to use the user from the project/email).
        // Best to fetch the project first to ensure it exists and get the userId if needed.
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { user: true }
        });

        if (!project) {
            throw new Error(`Project not found for ID: ${projectId}`);
        }

        // If the project has no user assigned yet (e.g. anonymous), we might want to attach this user?
        // For now, assume the user exists or is handled. The Payment model requires userId.
        // If project.userId is null (anonymous), we need a userId.
        // We can try to find user by email from Paystack data.
        let userId = project.userId;

        if (!userId) {
            const user = await prisma.user.findUnique({
                where: { email: data.customer.email }
            });
            userId = user?.id || null;
        }

        if (!userId) {
            // If we still don't have a user, we can't create the Payment record due to schema constraints.
            // Urgent TODO: Handle anonymous payments or create a shadow user?
            // For this specific 'Agent Webhooks' task, we assume authenticated or identifiable users for paid features usually.
            // But let's fail gracefully or throw.
            throw new Error(`Could not determine User ID for payment: ${data.reference}`);
        }

        // 3. Create Payment Record
        const payment = await prisma.payment.create({
            data: {
                amount: data.amount / 100, // Convert kobo to actual currency units if schema expects float standard units
                currency: data.currency,
                status: 'SUCCESS',
                reference: data.reference,
                gatewayResponse: JSON.stringify(data),
                userId: userId,
                projectId: projectId,
            }
        });

        // 4. Unlock Project
        await this.updateProjectUnlock(projectId, data.amount);

        // 5. Send Receipt Email (Async, don't block)
        this.sendReceiptEmail(userId, payment.id).catch(e =>
            console.error('[BillingService] Background email failed:', e)
        );

        return payment;
    },

    /**
     * Unlock a project for full access
     */
    async updateProjectUnlock(projectId: string, amountKobo?: number) {
        // CRITICAL FIX: Atomic update of both isUnlocked AND isLocked in same DB call
        // Previous bug: Two separate calls could leave project in inconsistent state
        const updateData: any = {
            isUnlocked: true,
            isLocked: true,  // Topic Lock: Enforced atomically with unlock
            lockedAt: new Date(),
            status: 'RESEARCH_IN_PROGRESS'
        };

        if (amountKobo) {
            // Paystack sends amount in Kobo
            const amountNaira = amountKobo / 100;
            const tier = getTierByPrice(amountNaira);

            if (tier) {
                // Infer Mode from Tier ID
                // Agency tiers start with 'AGENCY'
                const isAgency = tier.id.startsWith('AGENCY');
                updateData.mode = isAgency ? 'CONCIERGE' : 'DIY';
                console.log(`[BillingService] Inferred mode from price ${amountNaira}: ${updateData.mode}`);
            } else {
                console.warn(`[BillingService] Could not find tier for price ${amountNaira}`);
            }
        }

        await prisma.project.update({
            where: { id: projectId },
            data: updateData
        });
        console.log(`[BillingService] Unlocked project (paid) and Locked topic atomically: ${projectId}`);
    },

    async sendReceiptEmail(userId: string, paymentId: string) {
        try {
            // 1. Fetch details
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { project: true }
            });

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!payment || !user) {
                console.error(`[BillingService] Could not send receipt. Missing data. Payment: ${!!payment}, User: ${!!user}`);
                return;
            }

            // 2. Prepare Email Params
            const amountNaira = payment.amount; // stored as unit in DB (checked create logic)
            // Wait, in create logic: amount: data.amount / 100. So DB stores main currency unit (Naira).

            const emailParams = {
                email: user.email,
                name: user.name || 'Valued Customer',
                amount: amountNaira,
                reference: payment.reference,
                projectTopic: payment.project?.topic || 'Project Unlock',
                date: payment.createdAt
            };

            // 3. Send via EmailService
            await EmailService.sendPaymentReceipt(emailParams);

            console.log(`[BillingService] Receipt email sent to ${user.email} for payment ${payment.reference}`);
        } catch (error) {
            console.error('[BillingService] Failed to send receipt email:', error);
        }
    },

    async getPaymentHistory(userId: string) {
        return prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
};
