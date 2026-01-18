import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import { DashboardClient } from "@/features/dashboard/components/DashboardClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const user = await getCurrentUser();

    // Bolt optimization: Use findFirst to avoid fetching all projects (and their documents/chapters)
    // when we only show the most recent one. Also safeguards against undefined userId.
    const activeProject = user ? await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
            documents: {
                select: {
                    id: true,
                    projectId: true,
                    fileName: true,
                    fileType: true,
                    fileUrl: true,
                    status: true,
                    title: true, // Useful for metadata
                    processedAt: true,
                    // Exclude fileData (Bytes) to avoid serialization error
                }
            },
            chapters: {
                select: {
                    id: true,
                    number: true,
                    status: true,
                    wordCount: true,
                    updatedAt: true,
                },
                orderBy: { number: 'asc' }
            }
        }
    }) : null;

    return <DashboardClient activeProject={activeProject} />;
}
