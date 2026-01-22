
import { prisma } from "@/lib/prisma";
import { Project } from "@prisma/client";
import { z } from "zod";

export class ProjectsService {
    // Sentinel: Input validation schema for project creation
    // Prevents DoS (large payloads) and ensures data integrity
    private static createProjectSchema = z.object({
        // Fix: Check max length first (DoS protection), then trim, then check min length (meaningful content)
        topic: z.string().max(500, "Topic must be under 500 characters").trim().min(3, "Topic must be at least 3 characters"),
        twist: z.string().optional().nullable().transform(val => val?.trim() || "").pipe(
            z.string().max(1000, "Twist must be under 1000 characters")
        ),
        abstract: z.string().max(5000, "Abstract must be under 5000 characters").trim().min(1, "Abstract is required"),
        userId: z.string().optional().nullable(),
        anonymousId: z.string().optional().nullable(),
    });

    /**
     * Checks if a user has any locked projects.
     * Returns the locked project if found, null otherwise.
     */
    static async getLockedProject(userId: string): Promise<Project | null> {
        return prisma.project.findFirst({
            where: {
                userId,
                isLocked: true,
            },
        });
    }

    /**
     * Creates a new project, enforcing the "One Paid Project" rule.
     * If the user is authenticated and has a locked project, this throws an error.
     * If the user has an UNLOCKED but PAID project (from topic switch), we UPDATE it instead.
     */
    static async createProject(data: {
        topic: string;
        twist?: string;
        abstract: string;
        userId?: string | null;
        anonymousId?: string | null;
    }) {
        // Sentinel: Validate inputs using Zod
        const validation = this.createProjectSchema.safeParse(data);

        if (!validation.success) {
            const errorMessage = validation.error.issues.map(i => i.message).join(", ");
            throw new Error(`Invalid project data: ${errorMessage}`);
        }

        const validData = validation.data;

        if (validData.userId) {
            // Check for locked project - can't create new one
            const lockedProject = await this.getLockedProject(validData.userId);
            if (lockedProject) {
                throw new Error("User already has a locked project. Please switch topics via support or complete your current project.");
            }

            // CRITICAL: Check for unlocked but PAID project (from topic switch)
            // These should be UPDATED, not replaced with a new project, to preserve payment history
            const paidUnlockedProject = await prisma.project.findFirst({
                where: {
                    userId: validData.userId,
                    isLocked: false,
                    isUnlocked: true, // Has been paid for (workspace unlocked)
                },
                orderBy: { updatedAt: 'desc' }
            });

            if (paidUnlockedProject) {
                console.log(`[ProjectsService] Reusing paid unlocked project ${paidUnlockedProject.id} instead of creating new`);
                return prisma.project.update({
                    where: { id: paidUnlockedProject.id },
                    data: {
                        topic: validData.topic,
                        twist: validData.twist,
                        abstract: validData.abstract,
                        updatedAt: new Date()
                    }
                });
            }
        }

        return prisma.project.create({
            data: {
                topic: validData.topic,
                twist: validData.twist,
                abstract: validData.abstract,
                userId: validData.userId,
                anonymousId: validData.anonymousId,
            }
        });
    }

    /**
     * Locks a project effectively binding the user to this topic.
     * Typically called after payment.
     */
    static async lockProject(projectId: string) {
        return prisma.project.update({
            where: { id: projectId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
            }
        });
    }

    /**
     * Unlocks a project.
     * Used when a switch request is approved.
     */
    static async unlockProject(projectId: string) {
        return prisma.project.update({
            where: { id: projectId },
            data: {
                isLocked: false,
                lockedAt: null,
            }
        });
    }
}
