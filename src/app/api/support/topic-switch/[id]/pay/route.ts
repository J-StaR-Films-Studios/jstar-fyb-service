import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { TopicSwitchService } from "@/services/topic-switch.service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/support/topic-switch/[id]/pay
 * Initialize payment for an approved (pending_payment) topic switch request.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: requestId } = await params;

        // Validate request exists and is awaiting payment
        const request = await prisma.topicSwitchRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (request.userId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (request.status !== "pending_payment") {
            return NextResponse.json({
                error: "This request is not awaiting payment",
                status: request.status
            }, { status: 400 });
        }

        if (!request.fee) {
            return NextResponse.json({ error: "No fee amount set" }, { status: 400 });
        }

        // Initialize Paystack payment
        const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: user.email,
                amount: request.fee * 100, // Paystack uses kobo
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?verify_switch=true`,
                metadata: {
                    type: "topic_switch",
                    requestId: request.id,
                    projectId: request.projectId,
                    userId: user.id
                }
            })
        });

        const paystackData = await paystackRes.json();

        if (!paystackData.status) {
            console.error("[TopicSwitch Pay] Paystack error:", paystackData);
            return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            url: paystackData.data.authorization_url,
            reference: paystackData.data.reference
        });
    } catch (error: any) {
        console.error("[TopicSwitch Pay] Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
