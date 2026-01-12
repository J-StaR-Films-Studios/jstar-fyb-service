import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/partner-auth";

export interface CreateInfluencerData {
    name: string;
    email: string;
    phone?: string;
    referralCode: string;
    commissionRate?: number;
    referralDiscount?: number;
    freeCredits?: number;
}

export interface InfluencerStats {
    totalReferrals: number;
    totalEarnings: number;
    pendingPayout: number;
    creditsRemaining: number;
}

export const ReferralService = {
    /**
     * Validate a referral code and return the influencer if valid and active
     */
    async validateCode(code: string) {
        const influencer = await prisma.influencer.findUnique({
            where: { referralCode: code.toUpperCase() },
        });

        if (!influencer || !influencer.isActive) {
            return null;
        }

        return influencer;
    },

    /**
     * Link a user to an influencer via their referral code
     */
    async linkUserToInfluencer(userId: string, referralCode: string) {
        const influencer = await this.validateCode(referralCode);

        if (!influencer) {
            throw new Error("Invalid or inactive referral code");
        }

        // Check if user is already linked to an influencer
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referredById: true }
        });

        if (user?.referredById) {
            throw new Error("User is already linked to an influencer");
        }

        // Link user to influencer
        await prisma.user.update({
            where: { id: userId },
            data: { referredById: influencer.id }
        });

        console.log(`[ReferralService] Linked user ${userId} to influencer ${influencer.name} (${referralCode})`);
    },

    /**
     * Calculate and record commission for a successful payment
     * Called by BillingService after payment verification
     */
    async recordCommission(paymentId: string, paymentAmount: number) {
        // Get the payment with user and their referrer
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                user: {
                    include: { referredBy: true }
                }
            }
        });

        if (!payment?.user?.referredBy) {
            console.log(`[ReferralService] No referrer for payment ${paymentId}`);
            return null;
        }

        const influencer = payment.user.referredBy;
        const commissionRate = influencer.commissionRate || 0.10; // Default 10%
        const commissionAmount = paymentAmount * commissionRate;

        // Create commission record and update influencer earnings atomically
        const commission = await prisma.$transaction(async (tx) => {
            // Create commission
            const newCommission = await tx.commission.create({
                data: {
                    influencerId: influencer.id,
                    paymentId: paymentId,
                    amount: commissionAmount,
                    status: "PENDING"
                }
            });

            // Update influencer totals
            await tx.influencer.update({
                where: { id: influencer.id },
                data: {
                    totalEarnings: { increment: commissionAmount },
                    pendingPayout: { increment: commissionAmount }
                }
            });

            return newCommission;
        });

        console.log(`[ReferralService] Recorded commission ₦${commissionAmount} for influencer ${influencer.name}`);
        return commission;
    },

    /**
     * Get influencer statistics
     */
    async getInfluencerStats(influencerId: string): Promise<InfluencerStats> {
        const influencer = await prisma.influencer.findUnique({
            where: { id: influencerId },
            include: {
                _count: {
                    select: { referredUsers: true }
                }
            }
        });

        if (!influencer) {
            throw new Error("Influencer not found");
        }

        return {
            totalReferrals: influencer._count.referredUsers,
            totalEarnings: influencer.totalEarnings,
            pendingPayout: influencer.pendingPayout,
            creditsRemaining: influencer.freeCredits - influencer.creditsUsed
        };
    },

    /**
     * Admin: Create new influencer
     */
    async createInfluencer(data: CreateInfluencerData) {
        const referralCode = data.referralCode.toUpperCase().replace(/\s/g, '');

        // Check for existing code
        const existing = await prisma.influencer.findUnique({
            where: { referralCode }
        });

        if (existing) {
            throw new Error("Referral code already exists");
        }

        const influencer = await prisma.influencer.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                referralCode,

                commissionRate: data.commissionRate ?? 0.10,
                referralDiscount: data.referralDiscount ?? 0.0,
                freeCredits: data.freeCredits ?? 0,
                password: await hashPassword("ChangeMe123!") // Default password for new partners
            }
        });

        console.log(`[ReferralService] Created influencer: ${influencer.name} (${referralCode})`);
        return influencer;
    },

    /**
     * Admin: Grant free credits to an influencer (for demo purposes)
     */
    async grantFreeCredits(influencerId: string, amount: number) {
        const influencer = await prisma.influencer.update({
            where: { id: influencerId },
            data: {
                freeCredits: { increment: amount }
            }
        });

        console.log(`[ReferralService] Granted ₦${amount} free credits to ${influencer.name}`);
        return influencer;
    },

    /**
     * Admin: Mark commissions as paid
     */
    async markCommissionsPaid(influencerId: string) {
        const result = await prisma.$transaction(async (tx) => {
            // Get total pending
            const pending = await tx.commission.aggregate({
                where: { influencerId, status: "PENDING" },
                _sum: { amount: true }
            });

            const totalPending = pending._sum.amount || 0;

            // Mark all as paid
            await tx.commission.updateMany({
                where: { influencerId, status: "PENDING" },
                data: {
                    status: "PAID",
                    paidAt: new Date()
                }
            });

            // Update influencer's pending payout
            await tx.influencer.update({
                where: { id: influencerId },
                data: { pendingPayout: 0 }
            });

            return totalPending;
        });

        console.log(`[ReferralService] Marked ₦${result} as paid for influencer ${influencerId}`);
        return result;
    },

    /**
     * Admin: Toggle influencer active status
     */
    async toggleActive(influencerId: string) {
        const influencer = await prisma.influencer.findUnique({
            where: { id: influencerId }
        });

        if (!influencer) {
            throw new Error("Influencer not found");
        }

        const updated = await prisma.influencer.update({
            where: { id: influencerId },
            data: { isActive: !influencer.isActive }
        });

        return updated;
    },

    /**
     * Admin: Get all influencers with stats
     */
    async getAllInfluencers() {
        return prisma.influencer.findMany({
            include: {
                _count: {
                    select: {
                        referredUsers: true,
                        commissions: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    /**
     * Admin: Reset password
     */
    async adminResetPassword(influencerId: string, hashedPassword: string) {
        await prisma.influencer.update({
            where: { id: influencerId },
            data: { password: hashedPassword }
        });
    }
};

