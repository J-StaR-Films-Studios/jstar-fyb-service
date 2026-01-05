
import { prisma } from "@/lib/prisma";
import { Project } from "@prisma/client";

export class ProjectsService {
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
        if (data.userId) {
            // Check for locked project - can't create new one
            const lockedProject = await this.getLockedProject(data.userId);
            if (lockedProject) {
                throw new Error("User already has a locked project. Please switch topics via support or complete your current project.");
            }

            // CRITICAL: Check for unlocked but PAID project (from topic switch)
            // These should be UPDATED, not replaced with a new project, to preserve payment history
            const paidUnlockedProject = await prisma.project.findFirst({
                where: {
                    userId: data.userId,
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
                        topic: data.topic,
                        twist: data.twist || "",
                        abstract: data.abstract,
                        updatedAt: new Date()
                    }
                });
            }
        }

        return prisma.project.create({
            data: {
                topic: data.topic,
                twist: data.twist || "",
                abstract: data.abstract,
                userId: data.userId,
                anonymousId: data.anonymousId,
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
