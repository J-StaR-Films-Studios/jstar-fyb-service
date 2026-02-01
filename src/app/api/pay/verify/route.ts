import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { BillingService } from "@/services/billing.service";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Input validation schema
const verifyPaymentSchema = z.object({
    reference: z.string().min(1, "Reference is required")
});

// CRITICAL SECURITY FIX: Prevent duplicate processing with unique constraint check and enhanced security
const processPaymentVerification = async (reference: string) => {
    return await prisma.$transaction(async (tx) => {
        // 1. CRITICAL SECURITY FIX: Atomic check and reserve payment to prevent race conditions
        const reservedPayment = await tx.payment.updateMany({
            where: {
                reference: reference,
                status: { notIn: ['SUCCESS', 'FAILED'] }
            },
            data: {
                status: 'PROCESSING',
                updatedAt: new Date()
            }
        });

        if (reservedPayment.count === 0) {
            // Payment not found or already processed
            const existingPayment = await tx.payment.findUnique({
                where: { reference: reference },
                include: {
                    project: true,
                    user: true
                }
            });

            if (!existingPayment) {
                throw new Error("Payment record not found");
            }

            if (existingPayment.status === 'SUCCESS') {
                // Log duplicate verification attempt
                logger.warn(`Duplicate verification attempt for reference: ${reference}`, '[Security]');
                return { success: true, message: "Already verified", payment: existingPayment };
            }

            if (existingPayment.status === 'FAILED') {
                throw new Error("Payment was previously marked as failed");
            }

            if (existingPayment.status === 'PROCESSING') {
                throw new Error("Payment is currently being processed");
            }
        }

        // 2. Get the payment details after reserving
        const payment = await tx.payment.findUnique({
            where: { reference: reference },
            include: {
                project: true,
                user: true
            }
        });

        if (!payment) {
            throw new Error("Payment record not found");
        }

        // 3. Verify with Paystack
        const verifyRes = await PaystackService.verifyPayment(reference);

        if (!verifyRes.success || !verifyRes.data) {
            // CRITICAL SECURITY FIX: Atomic update to prevent race conditions
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    gatewayResponse: JSON.stringify({ error: "Gateway verification failed" }),
                    updatedAt: new Date()
                }
            });
            throw new Error("Verification failed at gateway");
        }

        const data = verifyRes.data;

        // 4. Validate transaction status
        if (data.status !== 'success') {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    gatewayResponse: JSON.stringify(data),
                    updatedAt: new Date()
                }
            });
            throw new Error("Transaction not successful");
        }

        // 5. CRITICAL SECURITY FIX: Verify amount matches (prevent amount tampering)
        const expectedAmount = payment.amount * 100; // Convert to kobo
        if (data.amount !== expectedAmount) {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    gatewayResponse: JSON.stringify({ ...data, error: "Amount mismatch" }),
                    updatedAt: new Date()
                }
            });
            throw new Error("Amount mismatch detected");
        }

        // 6. CRITICAL SECURITY FIX: Atomic update of payment and project with proper error handling
        // 2. Determine project to unlock (handling lead vs project IDs)
        const projectId = payment.projectId;
        let project = await tx.project.findUnique({ where: { id: projectId } });

        // If not found, check if it was a lead-based payment
        if (!project) {
            const lead = await tx.lead.findUnique({ where: { id: payment.projectId } });
            if (lead) {
                // If lead exists, find or create the project for this lead
                project = await tx.project.findFirst({
                    where: { topic: lead.topic, userId: payment.userId }
                });

                if (!project) {
                    project = await tx.project.create({
                        data: {
                            topic: lead.topic,
                            twist: lead.twist,
                            userId: payment.userId,
                            status: 'OUTLINE_GENERATED',
                            isUnlocked: true
                        }
                    });
                } else {
                    logger.error(`Link target not found: ${payment.projectId}`, '[PaymentVerify]');
                }
            }
        }

        // At this point status is SUCCESS (from Paystack verification check) or we set it manually below?
        // Wait, line 87 checks status !== 'success' and throws. So status IS success.
        // We need to MARK it as success in our DB if it wasn't already.
        // The reservedPayment set it to PROCESSING.
        // We must update it to SUCCESS.

        // 3. Update Statuses
        const metadata = typeof data.metadata === 'string'
            ? JSON.parse(data.metadata)
            : data.metadata;

        // TOPIC SWITCH PAYMENT: Handle separately
        if (metadata?.type === 'topic_switch' && metadata?.requestId) {

            // Update payment status first
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    gatewayResponse: JSON.stringify(data),
                    updatedAt: new Date()
                },
                include: {
                    project: true,
                    user: true
                }
            });

            // Process the topic switch (archives content and unlocks project)
            // Note: This needs to run outside the transaction as it does its own updates
            // We'll return early and let processPaidSwitch handle the rest
            return {
                success: true,
                payment: updatedPayment,
                project: null,
                isTopicSwitch: true,
                requestId: metadata.requestId,
                paymentRef: reference
            };
        }

        const tier = metadata?.tier;
        const isConciergeTier = tier && ['BASIC', 'STANDARD', 'PREMIUM'].includes(tier.toUpperCase());

        const [updatedPayment, updatedProject] = await Promise.all([
            tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    gatewayResponse: JSON.stringify(data),
                    updatedAt: new Date()
                },
                include: {
                    project: true,
                    user: true
                }
            }),
            project ? tx.project.update({
                where: { id: projectId },
                data: {
                    isUnlocked: true,
                    isLocked: true, // Fix: Enforce topic lock on payment
                    lockedAt: new Date(),
                    status: isConciergeTier ? "RESEARCH_IN_PROGRESS" : "UNLOCKED",
                    mode: isConciergeTier ? "CONCIERGE" : "DIY",
                    updatedAt: new Date()
                }
            }) : Promise.resolve(),
            // Additionally update the Lead status if this project belongs to a lead
            tx.lead.updateMany({
                where: {
                    OR: [
                        { id: metadata?.leadId },
                        { userId: payment.userId },
                        { anonymousId: project?.anonymousId }
                    ].filter(Boolean) as any,
                    // Only update the lead that matches the project topic (to be safe)
                    topic: {
                        contains: project?.topic || payment.project?.topic || ""
                    }
                },
                data: {
                    status: 'PAID'
                }
            })
        ]);

        return { success: true, payment: updatedPayment, project: updatedProject };
    }, {
        // Transaction timeout to prevent long locks
        timeout: 10000 // 10 seconds
    });
};

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate input
        const validation = verifyPaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid input",
                details: validation.error.format()
            }, { status: 400 });
        }

        const { reference } = validation.data;

        // Process payment verification with race condition protection
        const result = await processPaymentVerification(reference);

        // Handle topic switch payments separately
        if ((result as any).isTopicSwitch && (result as any).requestId) {
            try {
                const { TopicSwitchService } = await import('@/services/topic-switch.service');
                await TopicSwitchService.processPaidSwitch(
                    (result as any).requestId,
                    (result as any).paymentRef
                );
                logger.info('Topic switch payment processed successfully', '[Verify]');
            } catch (err) {
                logger.error(err, '[Verify] Failed to process topic switch');
                // Payment was still successful, but switch processing failed
                // This should be handled via a manual admin review
            }

            return NextResponse.json({
                success: true,
                message: "Topic switch payment verified successfully",
                paymentId: result.payment.id,
                projectId: result.payment.projectId,
                isTopicSwitch: true
            });
        }

        // CRITICAL FIX: Ensure commissions and discount usage are recorded
        // logic moved from BillingService.recordPayment to be shared
        try {
            await BillingService.processPostPaymentActions(
                result.payment.id,
                result.payment.amount * 100, // Pass in Kobo (payment.amount is in Naira/Main unit from update logic?)
                // Verify: line 156 set amount: data.amount / 100. So payment.amount is Naira.
                // processPostPaymentActions expects Kobo? 
                // Let's check definition: "amountKobo: number" -> "recordCommission(paymentId, amountKobo / 100)"
                // So if we pass valid Kobo, it divides by 100 to get Naira for commission.
                // yes: result.payment.amount * 100 is Kobo.
                result.payment.discountCodeId || undefined,
                result.payment.discountAmount || undefined
            );
            logger.info('Post-payment actions (commission/discount) processed', '[Verify]');
        } catch (err) {
            logger.error(err, '[Verify] Failed to process post-payment actions');
            // Don't fail the response, just log it.
        }

        // Send email receipt (outside transaction to avoid blocking)
        try {
            const { EmailService } = await import('@/services/email.service');
            await EmailService.sendPaymentReceipt({
                email: result.payment.user?.email || '',
                name: result.payment.user?.name || 'Student',
                amount: result.payment.amount,
                reference: result.payment.reference,
                projectTopic: result.project?.topic || '',
                date: new Date()
            });
        } catch (err) {
            logger.error(err, '[Verify] Failed to send receipt email');
            // Don't fail the payment if email fails
        }

        return NextResponse.json({
            success: true,
            message: result.message || "Payment verified successfully",
            paymentId: result.payment.id,
            projectId: result.project?.id || result.payment.projectId
        });

    } catch (error: any) {
        logger.error(error, '[PaymentVerify] Security error');

        // Return generic error message to prevent information disclosure
        if (error.message.includes("not found") ||
            error.message.includes("failed") ||
            error.message.includes("mismatch")) {
            return NextResponse.json({
                error: "Payment verification failed"
            }, { status: 400 });
        }

        return NextResponse.json({
            error: "Payment verification failed"
        }, { status: 500 });
    }
}
