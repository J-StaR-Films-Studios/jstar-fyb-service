import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-server";

const sendPaymentBodySchema = z.object({
    amount: z.number().positive(),
    tier: z.string(), // "Basic", "Standard", "Premium"
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
        const leadId = params.id;
        const body = await req.json();
        const { amount, tier } = sendPaymentBodySchema.parse(body);

        // 1. Fetch Lead
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        // 2. Determine Email
        // 2. Determine Email & Resolve User ID
        let email = "hey@jstarstudios.com"; // Default Fallback
        const leadUserId = lead.userId;
        let finalUserId: string | null = null;

        // Strategy: 
        // 1. Use Lead's UserId if valid
        // 2. Use Project's UserId if valid
        // 3. Find User by Email
        // 4. Create Shadow (Stub) User if none exists

        // Step A: Check Lead's User ID
        if (leadUserId) {
            const user = await prisma.user.findUnique({
                where: { id: leadUserId },
                select: { id: true, email: true },
            });
            if (user) {
                finalUserId = user.id;
                if (user.email) email = user.email;
            }
        }

        // Step B: Check Lead's Email if we still don't have a user
        if (!finalUserId && lead.email) {
            email = lead.email;
            const user = await prisma.user.findUnique({
                where: { email: lead.email },
                select: { id: true }
            });
            if (user) {
                finalUserId = user.id;
            }
        }

        // Step C: Create Shadow User if still no finalUserId
        if (!finalUserId) {
            // Check one last time if 'hey@jstarstudios.com' exists (if we fell back to default email)
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                // Create completely new user
                console.log(`[SendPaymentLink] Creating shadow user for email: ${email}`);
                const newUser = await prisma.user.create({
                    data: {
                        id: crypto.randomUUID(),
                        email: email,
                        name: lead.name || "J-Star Client",
                        role: "USER"
                    }
                });
                finalUserId = newUser.id;
            }
        }

        // 3. Generate Reference
        const timestamp = Date.now();
        // Sanitize characters: Only alphanumeric, dash, dot, =, _ allowed. 
        // We replace any other char with empty string, but IDs are usually safe.
        // Format: FYB-TIER-LEADIDSHORT-TIMESTAMP
        const safeTier = (tier || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, '');
        const safeLeadId = (leadId || "UNKNOWN").slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
        // Use strictly alphanumeric reference to prevent "Invalid character" errors
        const reference = `FYB${safeTier}${safeLeadId}${timestamp}`;

        // 4. Create or Find a Project for this lead
        let project = await prisma.project.findFirst({
            where: {
                topic: lead.topic,
                OR: [
                    { userId: finalUserId }, // Use our resolved ID
                    { anonymousId: lead.anonymousId || undefined }
                ].filter(o => Object.values(o).some(v => v !== undefined))
            }
        });

        if (!project) {
            project = await prisma.project.create({
                data: {
                    topic: lead.topic,
                    twist: lead.twist,
                    userId: finalUserId,
                    anonymousId: lead.anonymousId || undefined,
                    mode: "CONCIERGE", // Admin links are for concierge service
                    status: "OUTLINE_GENERATED"
                }
            });
        }

        // 5. Create Payment Record (to track this link)
        const payment = await prisma.payment.create({
            data: {
                userId: finalUserId, // Guaranteed to be a valid User ID now
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
                leadId,
                tier,
                paymentId: payment.id,
                custom_fields: [
                    { display_name: "Project Topic", variable_name: "project_topic", value: lead.topic },
                    { display_name: "Tier", variable_name: "tier", value: tier }
                ]
            },
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/project/builder?projectId=${project.id}&payment_ref=${reference}` // Redirect back to builder with projectId
        });

        // 6. Notify (Optional - Internal Log)
        await NotificationService.notifyPaymentLinkSent(leadId, amount, tier);

        return NextResponse.json({
            success: true,
            authorizationUrl: paymentData.authorizationUrl,
            reference: paymentData.reference,
            emailUsed: email
        });

    } catch (error) {
        console.error("[SendPaymentLink] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
