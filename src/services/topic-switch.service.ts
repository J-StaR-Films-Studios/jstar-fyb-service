
import { prisma } from "@/lib/prisma";
import { ProjectsService } from "./projects.service";
import { TopicSwitchRequest } from "@prisma/client";

export class TopicSwitchService {

    /**
     * Creates a topic switch request.
     * For "changed_mind" reason, includes the fee amount for admin visibility.
     */
    static async createRequest(data: {
        userId: string;
        projectId: string;
        reason: string;
        explanation?: string;
        proofUrl?: string;
        fee?: number;
    }) {
        // Validation: Check if project belongs to user
        const project = await prisma.project.findUnique({
            where: { id: data.projectId }
        });

        if (!project || project.userId !== data.userId) {
            throw new Error("Project not found or access denied");
        }

        if (!project.isLocked) {
            throw new Error("Project is not locked. You can simply edit the topic.");
        }

        // Check for existing pending requests
        const existingRequest = await prisma.topicSwitchRequest.findFirst({
            where: {
                projectId: data.projectId,
                status: { in: ["pending", "pending_payment"] }
            }
        });

        if (existingRequest) {
            throw new Error("A pending switch request already exists.");
        }

        const request = await prisma.topicSwitchRequest.create({
            data: {
                userId: data.userId,
                projectId: data.projectId,
                reason: data.reason,
                explanation: data.explanation,
                proofUrl: data.proofUrl,
                fee: data.fee || null,
            }
        });

        // Email Hook: New request submitted
        console.log('[Email] Would send to admin: New Topic Switch Request submitted', {
            requestId: request.id,
            reason: data.reason,
            hasFee: !!data.fee
        });

        return request;
    }

    /**
     * Reviews a request (Admin action).
     * For fee-based requests: approval sets status to "pending_payment" until user pays.
     * For free requests (lecturer_rejected): approval immediately unlocks.
     */
    static async reviewRequest(requestId: string, status: "approved" | "denied", adminId?: string) {
        const request = await prisma.topicSwitchRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new Error("Request not found");
        if (request.status !== "pending") throw new Error("Request already resolved");

        // If approving a fee-based request, set to pending_payment instead of approved
        const isFeeBasedRequest = request.fee && request.fee > 0;
        const finalStatus = (status === "approved" && isFeeBasedRequest)
            ? "pending_payment"
            : status;

        const updatedRequest = await prisma.topicSwitchRequest.update({
            where: { id: requestId },
            data: {
                status: finalStatus,
                resolvedAt: finalStatus === "denied" ? new Date() : null,
                resolvedBy: adminId || "system"
            }
        });

        // Email Hook: Request reviewed
        if (finalStatus === "pending_payment") {
            console.log('[Email] Would send to user: Your topic switch was approved! Pay to complete.', {
                requestId,
                paymentLink: `/profile?pay_switch=${requestId}`
            });
        } else if (status === "approved" && !isFeeBasedRequest) {
            // Free approval - archive and unlock immediately
            await this.archiveAndUnlock(request.projectId, requestId);
            console.log('[Email] Would send to user: Your topic switch was approved! You can now change your topic.');
        } else {
            console.log('[Email] Would send to user: Your topic switch request was denied.', { requestId });
        }

        return updatedRequest;
    }

    /**
     * Process payment for a fee-based switch request.
     * Called after Paystack payment verification.
     */
    static async processPaidSwitch(requestId: string, paymentRef: string) {
        const request = await prisma.topicSwitchRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new Error("Request not found");
        if (request.status !== "pending_payment") {
            throw new Error("Request is not awaiting payment");
        }

        // Update request with payment info
        await prisma.topicSwitchRequest.update({
            where: { id: requestId },
            data: {
                status: "approved",
                paymentRef,
                paidAt: new Date(),
                resolvedAt: new Date()
            }
        });

        // Archive and unlock
        await this.archiveAndUnlock(request.projectId, requestId);

        console.log('[Email] Would send to user: Payment received! Your topic switch is complete.');

        return { success: true };
    }

    /**
     * Archives old project content and unlocks the project for topic change.
     */
    private static async archiveAndUnlock(projectId: string, requestId: string) {
        // Fetch current project data for archiving
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                outline: true,
                chapters: {
                    select: { number: true, title: true, content: true, wordCount: true }
                }
            }
        });

        if (!project) throw new Error("Project not found");

        // Archive the old content
        await prisma.topicSwitchArchive.create({
            data: {
                requestId,
                projectId,
                oldTopic: project.topic,
                oldTwist: project.twist,
                oldAbstract: project.abstract,
                oldOutline: project.outline?.content
                    ? JSON.parse(project.outline.content)
                    : undefined,
                oldChapters: project.chapters.length > 0
                    ? project.chapters as unknown as object[]
                    : undefined
            }
        });

        // Clear project content and unlock
        await prisma.project.update({
            where: { id: projectId },
            data: {
                isLocked: false,
                abstract: null,
                // Mark that this project was just unlocked for topic change
                // This will trigger the warning modal in the builder
            }
        });

        // Delete outline
        if (project.outline) {
            await prisma.chapterOutline.delete({
                where: { projectId }
            });
        }

        // Delete chapters
        await prisma.chapter.deleteMany({
            where: { projectId }
        });

        console.log('[Archive] Project content archived and cleared for topic switch', {
            projectId,
            requestId,
            chaptersArchived: project.chapters.length
        });
    }

    /**
     * Get pending payment requests for a user (to show "Pay Now" button in profile)
     */
    static async getPendingPaymentRequest(userId: string, projectId: string) {
        return prisma.topicSwitchRequest.findFirst({
            where: {
                userId,
                projectId,
                status: "pending_payment"
            }
        });
    }
}
