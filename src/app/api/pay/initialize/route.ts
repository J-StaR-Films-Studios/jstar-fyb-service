import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { DiscountService } from "@/services/discount.service";
import { BillingService } from "@/services/billing.service";
import { randomUUID } from "crypto";

// Constant for now, can be moved to env/db later
const PROJECT_UNLOCK_AMOUNT = 15000;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch full user to check referral status
        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                referredById: true,
                referredBy: {
                    select: {
                        referralDiscount: true
                    }
                }
            }
        });

        // Use userData.referredById for checking exclusivity
        const isReferred = !!userData?.referredById;

        const { projectId, callbackUrl, discountCode } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Check ownership (should be claimed by now)
        if (project.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if already unlocked
        if (project.isUnlocked) {
            return NextResponse.json({ url: callbackUrl || `/project/${project.id}/workspace` });
        }

        // Calculate final amount (with potential discount)
        let finalAmount = PROJECT_UNLOCK_AMOUNT;
        let discountAmount = 0;
        // Check for automatic referral discount
        const referralDiscountRate = userData?.referredBy?.referralDiscount || 0;

        if (isReferred && referralDiscountRate > 0) {
            discountAmount = PROJECT_UNLOCK_AMOUNT * referralDiscountRate;
            finalAmount = PROJECT_UNLOCK_AMOUNT - discountAmount;
            // distinct from discountCodeId, we might want to log this differently later
        }

        let discountCodeId: string | undefined;

        // Validate and apply discount code if provided
        if (discountCode) {
            // MUTUAL EXCLUSIVITY RULE: Referred users cannot use discount codes
            if (isReferred) {
                // Determine if the referrer has a discount configured
                // Note: We need to fetch this above, let's restructure the check slightly.
                return NextResponse.json({
                    error: "Discount codes cannot be used while supporting a creator."
                }, { status: 400 });
            }

            const discountResult = await DiscountService.validateCode(discountCode, PROJECT_UNLOCK_AMOUNT);

            if (!discountResult.valid) {
                return NextResponse.json({
                    error: discountResult.error || "Invalid discount code"
                }, { status: 400 });
            }

            finalAmount = discountResult.discount!.finalAmount;
            discountAmount = discountResult.discount!.discountAmount;
            discountCodeId = discountResult.discount!.id;
        }

        // Generate a unique reference
        const reference = `ref_${randomUUID()}`;

        // Create Payment Record (Pending) with discount info
        await prisma.payment.create({
            data: {
                userId: user.id,
                projectId: project.id,
                reference: reference,
                amount: finalAmount,
                discountCodeId: discountCodeId,
                discountAmount: discountAmount,
                status: 'PENDING'
            }
        });

        // Initialize Paystack with final amount
        // HANDLE 100% DISCOUNT (Use "Free Pass" Logic)
        if (finalAmount <= 0) {
            console.log(`[PaymentInit] 100% Discount detected for user ${user.id}. Bypassing Paystack.`);

            // 1. Update Payment to SUCCESS immediately
            const successPayment = await prisma.payment.update({
                where: { reference: reference }, // reference comes from the create above which returned void? No, prisma.payment.create returns the object.
                // Wait, line 100 implies `prisma.payment.create`. I need to capture the result of that create call first to use its ID or use the reference in the where clause.
                // The previous code didn't capture the variable `payment`.
                // Let's look at lines 99-110 in the original file.
                // It used `await prisma.payment.create({...})` without assigning to a variable.
                // But we generated `reference` at line 97. So we can use `where: { reference }`.
                data: {
                    status: 'SUCCESS',
                    // channel not in schema
                    currency: 'NGN',
                    // paidAt not in schema, reliable on updatedAt/status
                    gatewayResponse: JSON.stringify({ message: '100% Discount Applied', discountCode })
                }
            });

            // 2. Unlock Project & Trigger Post-Payment Actions
            // Import dynamically or usage of imported services
            await BillingService.updateProjectUnlock(project.id, 0);
            await BillingService.processPostPaymentActions(successPayment.id, 0, discountCodeId, discountAmount);

            // 3. Return Success URL immediately
            return NextResponse.json({
                url: callbackUrl || `/project/${project.id}/workspace?payment=success`,
                originalAmount: PROJECT_UNLOCK_AMOUNT,
                finalAmount: 0,
                discountApplied: discountAmount
            });
        }

        const paystackRes = await PaystackService.initializePayment({
            email: user.email,
            amount: finalAmount,
            reference: reference,
            callbackUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/project/builder?payment=verifying`,
            metadata: {
                projectId: project.id,
                userId: user.id,
                customCallback: !!callbackUrl,
                discountCodeId: discountCodeId,
                discountAmount: discountAmount,
                originalAmount: PROJECT_UNLOCK_AMOUNT
            }
        });

        return NextResponse.json({
            url: paystackRes.authorizationUrl,
            originalAmount: PROJECT_UNLOCK_AMOUNT,
            finalAmount: finalAmount,
            discountApplied: discountAmount > 0 ? discountAmount : undefined
        });

    } catch (error: any) {
        console.error("[PaymentInit] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to initialize payment" }, { status: 500 });
    }
}
