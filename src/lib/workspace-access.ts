import { prisma } from '@/lib/prisma';

type WorkspaceProject = {
    userId: string | null;
    isUnlocked: boolean;
    testerAccess: boolean;
};

export function hasWorkspaceAccess(project: WorkspaceProject, userId: string): boolean {
    return project.userId === userId && (project.isUnlocked || project.testerAccess);
}

export async function canAccessWorkspace(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId,
            OR: [{ isUnlocked: true }, { testerAccess: true }]
        },
        select: { id: true }
    });
    return project !== null;
}
