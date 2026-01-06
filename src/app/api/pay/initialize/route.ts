import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { randomUUID } from "crypto";

// Constant for now, can be moved to env/db later
const PROJECT_UNLOCK_AMOUNT = 15000;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId, callbackUrl } = await req.json();

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

        // Generate a unique reference
        const reference = `ref_${randomUUID()}`;

        // Create Payment Record (Pending)
        await prisma.payment.create({
            data: {
                userId: user.id,
                projectId: project.id,
                reference: reference,
                amount: PROJECT_UNLOCK_AMOUNT,
                status: 'PENDING'
            }
        });

        // Initialize Paystack
        const paystackRes = await PaystackService.initializePayment({
            email: user.email,
            amount: PROJECT_UNLOCK_AMOUNT,
            reference: reference,
            callbackUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/project/builder?payment=verifying`,
            metadata: {
                projectId: project.id,
                userId: user.id,
                customCallback: !!callbackUrl
            }
        });

        return NextResponse.json({ url: paystackRes.authorizationUrl });

    } catch (error: any) {
        console.error("[PaymentInit] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to initialize payment" }, { status: 500 });
    }
}
