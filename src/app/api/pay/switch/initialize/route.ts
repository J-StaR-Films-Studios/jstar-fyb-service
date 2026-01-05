import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { randomUUID } from "crypto";

const TOPIC_SWITCH_FEE = 2000; // ₦2,000

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { requestId } = await req.json();

        if (!requestId) {
            return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
        }

        // Find the topic switch request
        const switchRequest = await prisma.topicSwitchRequest.findUnique({
            where: { id: requestId }
        });

        if (!switchRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Verify ownership
        if (switchRequest.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Verify status is pending_payment
        if (switchRequest.status !== "pending_payment") {
            return NextResponse.json({
                error: "This request is not awaiting payment",
                status: switchRequest.status
            }, { status: 400 });
        }

        // Generate a unique reference
        const reference = `switch_${randomUUID()}`;

        // Create Payment Record (Pending) - link to the project
        await prisma.payment.create({
            data: {
                userId: user.id,
                projectId: switchRequest.projectId,
                reference: reference,
                amount: switchRequest.fee || TOPIC_SWITCH_FEE,
                status: 'PENDING'
            }
        });

        // Initialize Paystack with topic_switch metadata
        const paystackRes = await PaystackService.initializePayment({
            email: user.email,
            amount: switchRequest.fee || TOPIC_SWITCH_FEE,
            reference: reference,
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=verifying`,
            metadata: {
                type: "topic_switch",
                requestId: switchRequest.id,
                projectId: switchRequest.projectId,
                userId: user.id
            }
        });

        return NextResponse.json({ url: paystackRes.authorizationUrl });

    } catch (error: any) {
        console.error("[TopicSwitchPaymentInit] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to initialize payment" }, { status: 500 });
    }
}
