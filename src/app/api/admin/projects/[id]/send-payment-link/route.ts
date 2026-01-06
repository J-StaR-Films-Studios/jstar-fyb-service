import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-server";

const sendPaymentBodySchema = z.object({
    amount: z.number().nonnegative(), // Allow 0 if fully paid (though we likely won't call it then)
    tier: z.string(),
});

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
        }
        const params = await props.params;
        const projectId = params.id;
        const body = await req.json();
        const { amount, tier } = sendPaymentBodySchema.parse(body);

        // 1. Fetch Project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { user: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // 2. Determine Email
        let email = "hey@jstarstudios.com"; // Default Fallback
        if (project.user && project.user.email) {
            email = project.user.email;
        }

        // 3. Generate Reference
        // Format: FYB-UPGRADE-PROJIDSHORT-TIMESTAMP
        const timestamp = Date.now();
        const safeTier = (tier || "UPGRADE").toUpperCase().replace(/[^A-Z0-9]/g, '');
        const safeProjId = (projectId || "UNKNOWN").slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
        const reference = `FYB${safeTier}${safeProjId}${timestamp}`;

        // 4. Create Payment Record (Pending)
        // This tracks the intent to pay
        const payment = await prisma.payment.create({
            data: {
                userId: project.userId || "ADMIN_LINK_UNKNOWN_USER", // Should vary rarely match
                projectId: project.id,
                reference: reference,
                amount: amount,
                status: 'PENDING',
                currency: 'NGN'
            }
        });

        // 5. Initialize Paystack
        const paymentData = await PaystackService.initializePayment({
            email,
            amount,
            reference,
            metadata: {
                projectId: project.id,
                tier,
                paymentId: payment.id,
                isUpgrade: true,
                custom_fields: [
                    { display_name: "Project Topic", variable_name: "project_topic", value: project.topic },
                    { display_name: "Upgrade Tier", variable_name: "tier", value: tier }
                ]
            },
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/project/builder?projectId=${project.id}&payment_ref=${reference}`
        });

        // 6. Notify (Optional)
        // await NotificationService.notifyUpgradeLinkSent(project.id, amount, tier);

        return NextResponse.json({
            success: true,
            authorizationUrl: paymentData.authorizationUrl,
            reference: paymentData.reference,
            emailUsed: email
        });

    } catch (error) {
        console.error("[SendProjectPaymentLink] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
