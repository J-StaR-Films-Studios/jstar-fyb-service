import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { ProjectData } from "@/features/builder/store/useBuilderStore";
import { BuilderClient } from "./BuilderClient"; // We'll assume it's in the same folder
import { Chapter } from "@/features/builder/schemas/outlineSchema";

interface PageProps {
    searchParams: Promise<{ projectId?: string; payment_ref?: string }>;
}

export default async function BuilderPage({ searchParams }: PageProps) {
    const user = await getCurrentUser();
    const params = await searchParams;
    const targetProjectId = params?.projectId; // From upgrade callback URL

    let serverProject: Partial<ProjectData> | null = null;

    if (user) {
        let recentProject = null;

        // Priority 1: If projectId is specified in URL (e.g., from upgrade callback), load THAT project
        if (targetProjectId) {
            console.log(`[BuilderPage] Loading specific project from URL: ${targetProjectId}`);
            recentProject = await prisma.project.findUnique({
                where: { id: targetProjectId },
                include: { outline: true }
            });
            // Security: Verify the project belongs to this user (or is anonymous and claimable)
            if (recentProject && recentProject.userId && recentProject.userId !== user.id) {
                console.warn(`[BuilderPage] User ${user.id} tried to access project ${targetProjectId} owned by ${recentProject.userId}`);
                recentProject = null; // Don't load someone else's project
            }
        }

        // Priority 2: Try to load the user's UNLOCKED (paid) project first
        // This prevents accidentally loading a stale unpaid draft if multiple projects exist
        if (!recentProject) {
            recentProject = await prisma.project.findFirst({
                where: { userId: user.id, isUnlocked: true },
                orderBy: { updatedAt: 'desc' },
                include: { outline: true }
            });
            if (recentProject) {
                console.log(`[BuilderPage] Loaded user's UNLOCKED project: ${recentProject.id}`);
            }
        }

        // Priority 3: Fall back to most recent project (even if not paid)
        if (!recentProject) {
            recentProject = await prisma.project.findFirst({
                where: { userId: user.id },
                orderBy: { updatedAt: 'desc' },
                include: { outline: true }
            });
            if (recentProject) {
                console.log(`[BuilderPage] Loaded user's most recent project: ${recentProject.id}`);
            }
        }

        if (recentProject) {
            // Map to ProjectData
            let parsedOutline: Chapter[] = [];
            if (recentProject.outline && recentProject.outline.content) {
                try {
                    const rawOutline = JSON.parse(recentProject.outline.content);
                    // DEFENSIVE FIX: Normalize object format to array
                    // (streaming can save {0: {...}} instead of [{...}])
                    parsedOutline = Array.isArray(rawOutline)
                        ? rawOutline
                        : Object.values(rawOutline);
                } catch (e) {
                    console.error("Failed to parse outline content", e);
                }
            }

            serverProject = {
                userId: user.id,
                projectId: recentProject.id,
                topic: recentProject.topic,
                twist: recentProject.twist || "",
                abstract: recentProject.abstract || "",
                outline: parsedOutline,
                // @ts-ignore - casting string to literal type
                mode: recentProject.mode as any,
                // @ts-ignore - casting string to literal type
                status: recentProject.status as any,
                isLocked: recentProject.isLocked || false,
            };
        }
    }

    // @ts-ignore
    const isUnlocked = serverProject ? (await prisma.project.findUnique({ where: { id: serverProject.projectId! }, select: { isUnlocked: true } }))?.isUnlocked : false;

    return (
        <Suspense fallback={<div className="min-h-screen bg-dark flex items-center justify-center text-white/50">Loading Builder...</div>}>
            <BuilderClient serverProject={serverProject} serverIsPaid={isUnlocked || false} />
        </Suspense>
    );
}
