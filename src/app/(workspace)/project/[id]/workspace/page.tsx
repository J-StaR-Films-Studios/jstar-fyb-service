import { ChapterEditor } from '@/features/builder/components/v2/ChapterEditor';
import { prisma } from '@/lib/prisma';
import { WorkspaceLockScreen } from '@/features/builder/components/WorkspaceLockScreen';
import { WORKSPACE_UNLOCK_PRICE } from '@/config/pricing';

interface WorkspacePageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
    const { id } = await params;
    const { reference, tab } = await searchParams; // Extract Paystack reference and tab

    // CANONICAL UNLOCK CHECK: Use `isUnlocked` field as the single source of truth.
    // This supports: normal payments, 100% discounts, admin overrides, etc.
    const project = await prisma.project.findUnique({
        where: { id },
        select: {
            isUnlocked: true,
            topic: true,
            userId: true
        }
    });

    if (!project) {
        return <div className="min-h-screen flex items-center justify-center text-white">Project not found</div>;
    }

    if (!project.isUnlocked) {
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
