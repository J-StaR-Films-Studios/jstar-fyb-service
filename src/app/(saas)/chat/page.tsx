import { ChatInterface } from '@/features/bot/components/ChatInterface';
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { SaasShell } from '@/features/ui/SaasShell';
import { BotSwitcher } from '@/features/bot/components/BotSwitcher';

export default async function ChatPage() {
    const user = await getCurrentUser();

    if (!user) {
        return <ChatInterface initialUser={null} />;
    }

    // Check if user has active project (for standard nav state)
    const hasActiveProject = await prisma.project.count({
        where: { userId: user.id }
    }) > 0;

    // Get latest project for Monji link
    const latestProject = await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
    });

    return (
        <SaasShell
            user={{ name: user.name, image: user.image }}
            hasActiveProject={hasActiveProject}
            fullWidth
            noPadding
            hideBottomNav
            headerContent={<BotSwitcher currentBot="jay" latestProjectId={latestProject?.id} />}
        >
            <ChatInterface initialUser={user} hideHeader />
        </SaasShell>
    );
}
