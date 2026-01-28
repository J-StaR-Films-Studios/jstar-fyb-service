import { prisma } from "@/lib/prisma";
import { getTierByPrice } from "@/config/pricing";
import { EmailService } from "@/services/email.service";
import { ProjectsService } from "./projects.service";
import { logger } from "@/lib/logger";

export interface PaymentData {
    reference: string;
    amount: number; // In kobo
    currency: string;
    channel: string;
    status: string;
    paid_at: string;
    metadata?: {
        projectId?: string; // We expect projectId in metadata
        discountCodeId?: string;
        discountAmount?: number;
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
            logger.error({ reference: data.reference }, '[BillingService] No projectId found in payment metadata');
            // We might still want to record the payment, but we can't link it to a project easily without the ID.
            // For now, let's try to find the project by other means or just record it with a null project if the schema allowed (it doesn't).
            // Schema requires projectId on Payment. If it's missing, we have a problem.
            throw new Error(`Missing projectId in metadata for reference: ${data.reference}`);
        }

        // 1. Check for existing payment
        let payment = await prisma.payment.findUnique({
            where: { reference: data.reference }
        });

        // Idempotency: If already success, return immediately
        if (payment && payment.status === 'SUCCESS') {
            logger.info(`[BillingService] Payment already processed: ${data.reference}`);
            return payment;
        }

        // 2. Identify User (if creating new)
        let userId = payment?.userId;
        if (!userId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { user: true }
            });

            if (!project) throw new Error(`Project not found: ${projectId}`);
            userId = project.userId || undefined;

            // Fallback to email lookup if project is anonymous
            if (!userId) {
                const user = await prisma.user.findUnique({ where: { email: data.customer.email } });
                userId = user?.id || undefined;
            }

            if (!userId) throw new Error(`Could not determine User ID for payment: ${data.reference}`);
        }

        // 3. Update or Create Payment Record
        if (payment) {
            // Update existing pending payment
            payment = await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    gatewayResponse: JSON.stringify(data),
                    // Ensure amount is accurate from gateway
                    amount: data.amount / 100
                }
            });
        } else {
            // Fallback: Create new record
            payment = await prisma.payment.create({
                data: {
                    amount: data.amount / 100,
                    currency: data.currency,
                    status: 'SUCCESS',
                    reference: data.reference,
                    gatewayResponse: JSON.stringify(data),
                    userId: userId,
                    projectId: projectId,
                    // Note: If creating new, we might miss discountCodeId unless passed in metadata
                    // which isn't currently standard, but this is a fallback path.
                }
            });
        }

        // 4. Unlock Project
        await this.updateProjectUnlock(projectId, data.amount);

        // 5. Post-Payment Actions (Async/Non-blocking but awaited for safety)
        await this.processPostPaymentActions(payment.id, data.amount, payment.discountCodeId || undefined, payment.discountAmount || undefined);

        // 6. Send Receipt Email
        this.sendReceiptEmail(userId, payment.id).catch(e =>
            logger.error({ message: e instanceof Error ? e.message : String(e) }, '[BillingService] Background email failed')
        );

        return payment;
    },

    /**
     * Handle actions after a successful payment (Commissons, Discounts, etc.)
     * Can be called by Webhook OR Verification route.
     * Idempotent-safe (commission recorder checks for dupes somewhat, but we should rely on status checks before calling this).
     */
    async processPostPaymentActions(paymentId: string, amountKobo: number, discountCodeId?: string, discountAmount?: number) {
        try {
            // A. Record Commission
            const { ReferralService } = await import('@/services/referral.service');
            await ReferralService.recordCommission(paymentId, amountKobo / 100); // recordCommission expects main currency? Let's check. Yes, likely main currency as it calculates %. Wait, payment.amount is usually main currency.
            // In recordPayment: amount: data.amount / 100.
            // referralService.recordCommission(payment.id, payment.amount) passed the main currency amount.
            // Here `amountKobo` is passed. So divide by 100.

            // B. increment Discount Usage
            if (discountCodeId && discountAmount) {
                await prisma.discountCode.update({
                    where: { id: discountCodeId },
                    data: { currentUses: { increment: 1 } }
                });
                logger.info(`[BillingService] Incremented usage for discount ${discountCodeId}`);
            }

        } catch (err) {
            logger.error({ message: err instanceof Error ? err.message : String(err) }, '[BillingService] Failed to process post-payment actions');
        }
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
                logger.info(`[BillingService] Inferred mode from price ${amountNaira}: ${updateData.mode}`);
            } else {
                logger.warn(`[BillingService] Could not find tier for price ${amountNaira}`);
            }
        }

        await prisma.project.update({
            where: { id: projectId },
            data: updateData
        });
        logger.info(`[BillingService] Unlocked project (paid) and Locked topic atomically: ${projectId}`);
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
                logger.error(`[BillingService] Could not send receipt. Missing data. Payment: ${!!payment}, User: ${!!user}`);
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

            logger.info(`[BillingService] Receipt email sent to ${user.email} for payment ${payment.reference}`);
        } catch (error) {
            logger.error({ message: error instanceof Error ? error.message : String(error) }, '[BillingService] Failed to send receipt email');
        }
    },

    async getPaymentHistory(userId: string) {
        return prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
};
