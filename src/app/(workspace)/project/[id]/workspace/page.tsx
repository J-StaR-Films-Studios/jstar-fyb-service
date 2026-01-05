import { ChapterEditor } from '@/features/builder/components/v2/ChapterEditor';
import { prisma } from '@/lib/prisma';
import { WorkspaceLockScreen } from '@/features/builder/components/WorkspaceLockScreen';

interface WorkspacePageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
    const { id } = await params;
    const { reference } = await searchParams; // Extract Paystack reference

    // Verify payment status
    // We check if the project has successful payments totaling at least 15,000
    const paymentAgg = await prisma.payment.aggregate({
        _sum: {
            amount: true
        },
        where: {
            projectId: id,
            status: 'SUCCESS'
        }
    });

    const totalPaid = paymentAgg._sum.amount || 0;
    const REQUIRED_AMOUNT = 15000;

    if (totalPaid < REQUIRED_AMOUNT) {
        return (
            <WorkspaceLockScreen
                projectId={id}
                requiredAmount={REQUIRED_AMOUNT}
                paymentReference={typeof reference === 'string' ? reference : undefined}
            />
        );
    }

    return (
        <ChapterEditor projectId={id} />
    );
}