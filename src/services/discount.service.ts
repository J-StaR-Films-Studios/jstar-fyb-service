import { prisma } from "@/lib/prisma";

export interface CreateDiscountCodeData {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    maxUses?: number;
    minAmount?: number;
    expiresAt?: Date;
}

export interface DiscountValidationResult {
    isValid: boolean;
    discount?: {
        id: string;
        code: string;
        type: string;
        value: number;
        discountAmount: number;
        finalAmount: number;
    };
    error?: string;
}

export const DiscountService = {
    /**
     * Validate a discount code for a given amount
     */
    async validateCode(code: string, amount: number): Promise<DiscountValidationResult> {
        const discountCode = await prisma.discountCode.findUnique({
            where: { code: code.toUpperCase() }
        });

        // Check if code exists
        if (!discountCode) {
            return { isValid: false, error: "Invalid discount code" };
        }

        // Check if active
        if (!discountCode.isActive) {
            return { isValid: false, error: "This discount code is no longer active" };
        }

        // Check expiry
        if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
            return { isValid: false, error: "This discount code has expired" };
        }

        // Check usage limit
        if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
            return { isValid: false, error: "This discount code has reached its usage limit" };
        }

        // Check minimum amount
        if (discountCode.minAmount && amount < discountCode.minAmount) {
            return {
                isValid: false,
                error: `Minimum purchase of ₦${discountCode.minAmount.toLocaleString()} required`
            };
        }

        // Calculate discount
        const discountAmount = this.calculateDiscount(discountCode, amount);
        const finalAmount = amount - discountAmount;

        return {
            isValid: true,
            discount: {
                id: discountCode.id,
                code: discountCode.code,
                type: discountCode.discountType,
                value: discountCode.discountValue,
                discountAmount,
                finalAmount
            }
        };
    },

    /**
     * Calculate the discount amount for a given code and amount
     */
    calculateDiscount(
        discountCode: { discountType: string; discountValue: number },
        originalAmount: number
    ): number {
        if (discountCode.discountType === "PERCENTAGE") {
            return Math.round(originalAmount * (discountCode.discountValue / 100));
        } else {
            // FIXED discount
            return Math.min(discountCode.discountValue, originalAmount);
        }
    },

    /**
     * Apply discount to payment (increment usage counter)
     * Called after successful payment
     */
    async applyToPayment(codeId: string, paymentId: string, discountAmount: number) {
        await prisma.$transaction([
            // Increment usage counter
            prisma.discountCode.update({
                where: { id: codeId },
                data: { currentUses: { increment: 1 } }
            }),
            // Update payment with discount info
            prisma.payment.update({
                where: { id: paymentId },
                data: {
                    discountCodeId: codeId,
                    discountAmount: discountAmount
                }
            })
        ]);

        console.log(`[DiscountService] Applied discount ${codeId} to payment ${paymentId}`);
    },

    /**
     * Admin: Create a new discount code
     */
    async createCode(data: CreateDiscountCodeData) {
        const code = data.code.toUpperCase().replace(/\s/g, '');

        // Check for existing code
        const existing = await prisma.discountCode.findUnique({
            where: { code }
        });

        if (existing) {
            throw new Error("Discount code already exists");
        }

        const discountCode = await prisma.discountCode.create({
            data: {
                code,
                discountType: data.discountType,
                discountValue: data.discountValue,
                maxUses: data.maxUses,
                minAmount: data.minAmount,
                expiresAt: data.expiresAt
            }
        });

        console.log(`[DiscountService] Created discount code: ${code}`);
        return discountCode;
    },

    /**
     * Admin: Deactivate a discount code
     */
    async deactivateCode(codeId: string) {
        const discountCode = await prisma.discountCode.update({
            where: { id: codeId },
            data: { isActive: false }
        });

        console.log(`[DiscountService] Deactivated discount code: ${discountCode.code}`);
        return discountCode;
    },

    /**
     * Admin: Get all discount codes with usage stats
     */
    async getAllCodes() {
        return prisma.discountCode.findMany({
            include: {
                _count: {
                    select: { payments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    /**
     * Get a discount code by ID
     */
    async getById(codeId: string) {
        return prisma.discountCode.findUnique({
            where: { id: codeId }
        });
    }
};
