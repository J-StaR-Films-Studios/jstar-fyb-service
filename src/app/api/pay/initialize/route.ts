import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { DiscountService } from "@/services/discount.service";
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
            select: { referredById: true }
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
        let discountCodeId: string | undefined;

        // Validate and apply discount code if provided
        if (discountCode) {
            // MUTUAL EXCLUSIVITY RULE: Referred users cannot use discount codes
            if (isReferred) {
                return NextResponse.json({
                    error: "Discount codes cannot be used while supporting a creator."
                }, { status: 400 });
            }

            const discountResult = await DiscountService.validateCode(discountCode, PROJECT_UNLOCK_AMOUNT);

            if (!discountResult.isValid) {
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
