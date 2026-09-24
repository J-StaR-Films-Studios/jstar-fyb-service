import { ChapterEditor } from '@/features/builder/components/v2/ChapterEditor';
import { prisma } from '@/lib/prisma';
import { WorkspaceLockScreen } from '@/features/builder/components/WorkspaceLockScreen';
import { WORKSPACE_UNLOCK_PRICE } from '@/config/pricing';
import { getCurrentUser } from '@/lib/auth-server';

interface WorkspacePageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
    const { id } = await params;
    const { reference, tab } = await searchParams; // Extract Paystack reference and tab

    // Paid unlocks remain separate from revocable tester access.
    const project = await prisma.project.findUnique({
        where: { id },
        select: {
            isUnlocked: true,
            testerAccess: true,
            topic: true,
            userId: true
        }
    });

    if (!project) {
        return <div className="min-h-screen flex items-center justify-center text-white">Project not found</div>;
    }

    const tester = project.testerAccess ? await getCurrentUser() : null;
    if (!project.isUnlocked && !(project.testerAccess && tester?.id === project.userId)) {
        // Check if user is referred (to disable discount codes)
        let isReferred = false;
        if (project?.userId) {
            const user = await prisma.user.findUnique({
                where: { id: project.userId },
                select: { referredById: true }
            });
            isReferred = !!user?.referredById;
        }

        return (
            <WorkspaceLockScreen
                projectId={id}
                requiredAmount={WORKSPACE_UNLOCK_PRICE}
                paymentReference={typeof reference === 'string' ? reference : undefined}
                projectTopic={project?.topic}
                isReferred={isReferred}
            />
        );
    }

    return (
        <ChapterEditor
            projectId={id}
            initialTab={typeof tab === 'string' ? tab : 'research'}
        />
    );
}
