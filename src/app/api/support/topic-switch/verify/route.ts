import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { TopicSwitchService } from "@/services/topic-switch.service";
import { PaystackService } from "@/services/paystack.service";

/**
 * POST /api/support/topic-switch/verify
 * Verify Paystack payment for topic switch fee.
 * Called after user returns from Paystack payment page.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { reference } = await req.json();
        if (!reference) {
            return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
        }

        // Verify with Paystack
        const verifyRes = await PaystackService.verifyPayment(reference);

        if (!verifyRes.success || !verifyRes.data) {
            return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
        }

        const data = verifyRes.data;

        if (data.status !== 'success') {
            return NextResponse.json({
                error: "Payment not successful",
                details: data.gateway_response
            }, { status: 400 });
        }

        // Extract request ID from metadata
        const metadata = typeof data.metadata === 'string'
            ? JSON.parse(data.metadata)
            : data.metadata;

        if (metadata?.type !== 'topic_switch' || !metadata?.requestId) {
            return NextResponse.json({
                error: "Invalid payment type",
                message: "This payment is not for a topic switch"
            }, { status: 400 });
        }

        // Process the paid switch
        const result = await TopicSwitchService.processPaidSwitch(
            metadata.requestId,
            reference
        );

        return NextResponse.json({
            success: true,
            message: "Topic switch complete! You can now change your topic.",
            projectId: metadata.projectId
        });

    } catch (error: any) {
        console.error("[TopicSwitch Verify] Error:", error);
        return NextResponse.json({
            error: error.message || "Verification failed"
        }, { status: 500 });
    }
}
