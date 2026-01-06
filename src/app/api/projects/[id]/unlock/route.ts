import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logger, securityLogger } from "@/lib/logger";

// Input validation schema
const unlockProjectSchema = z.object({
    id: z.string().uuid("Invalid project ID format")
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    let id: string = '';

    try {
        const paramsObj = await params;
        id = paramsObj.id;

        // Validate project ID format
        const validation = unlockProjectSchema.safeParse({ id });
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid project ID format"
            }, { status: 400 });
        }

        const user = await getCurrentUser();

        // CRITICAL SECURITY FIX: Enhanced authentication check with proper error handling
        if (!user?.id) {
            // Log security event for unauthorized access attempt
            securityLogger.suspiciousActivity({
                activity: 'project_unlock_unauthorized_attempt',
                details: {
                    projectId: validation.data.id,
                    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
                }
            });

            return NextResponse.json({
                error: "Authentication required"
            }, { status: 401 });
        }

        // CRITICAL SECURITY FIX: Atomic check and update to prevent race conditions
        const project = await prisma.$transaction(async (tx) => {
            // Check if project exists and belongs to user with proper error handling
            const existing = await tx.project.findUnique({
                where: {
                    id: validation.data.id,
                    userId: user.id
                },
                select: {
                    id: true,
                    isUnlocked: true,
                    status: true,
                    topic: true,
                    userId: true
                }
            });

            if (!existing) {
                // Log security event for access attempt to non-existent or unauthorized project
                securityLogger.suspiciousActivity({
                    userId: user.id,
                    activity: 'project_unlock_access_denied',
                    details: {
                        projectId: validation.data.id,
                        attemptedUserId: user.id,
                        actualUserId: null
                    }
                });

                throw new Error("Project not found or access denied");
            }

            // Additional security check: Ensure user owns the project
            if (existing.userId !== user.id) {
                securityLogger.suspiciousActivity({
                    userId: user.id,
                    activity: 'project_unlock_ownership_violation',
                    details: {
                        projectId: validation.data.id,
                        attemptedUserId: user.id,
                        actualUserId: existing.userId
                    }
                });

                throw new Error("Access denied: You do not own this project");
            }

            // Check if already unlocked
            if (existing.isUnlocked) {
                throw new Error("Project is already unlocked");
            }

            // CRITICAL SECURITY FIX: Update project status with audit trail
            // ATOMICITY FIX: Set both isUnlocked AND isLocked in same call
            const updatedProject = await tx.project.update({
                where: { id: existing.id },
                data: {
                    isUnlocked: true,
                    isLocked: true,  // Topic Lock: Enforced atomically with unlock
                    lockedAt: new Date(),
                    status: "UNLOCKED"
                }
            });

            // Log successful unlock for audit trail
            securityLogger.dataAccess({
                userId: user.id,
                resource: `project:${updatedProject.id}`,
                action: 'unlock'
            });

            return updatedProject;
        });

        // Log security event
        securityLogger.dataAccess({
            userId: user.id,
            resource: `project:${project.id}`,
            action: 'unlock'
        });

        return NextResponse.json({
            success: true,
            project: {
                id: project.id,
                topic: project.topic,
                isUnlocked: project.isUnlocked,
                status: project.status
            }
        });

    } catch (error) {
        const currentUser = await getCurrentUser();

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                securityLogger.suspiciousActivity({
                    userId: currentUser?.id,
                    activity: 'project_unlock_attempt_not_found',
                    details: { projectId: id }
                });

                return NextResponse.json({
                    error: "Project not found or access denied"
                }, { status: 404 });
            }
        }

        // Don't expose internal error details
        if (error instanceof Error) {
            if (error.message === "Project not found or access denied") {
                securityLogger.suspiciousActivity({
                    userId: currentUser?.id,
                    activity: 'project_unlock_access_denied',
                    details: { projectId: id }
                });

                return NextResponse.json({
                    error: "Project not found or access denied"
                }, { status: 404 });
            }
            if (error.message === "Project is already unlocked") {
                return NextResponse.json({
                    error: "Project is already unlocked"
                }, { status: 409 });
            }
            if (error.message === "Access denied: You do not own this project") {
                securityLogger.suspiciousActivity({
                    userId: currentUser?.id,
                    activity: 'project_unlock_ownership_violation',
                    details: { projectId: id }
                });

                return NextResponse.json({
                    error: "Access denied: You do not own this project"
                }, { status: 403 });
            }
        }

        logger.error(`Project unlock failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        return NextResponse.json({
            error: "Failed to unlock project"
        }, { status: 500 });
    }
}
