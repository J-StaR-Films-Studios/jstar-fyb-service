import { HubChatInterface } from '@/features/bot/components/HubChatInterface';
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from 'next/navigation';
import { SaasShell } from '@/features/ui/SaasShell';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';

export const metadata = {
    title: 'Nengi • J Star Hub',
    description: 'Your creative partner and brain dump.',
};

import { BotSwitcher } from '@/features/bot/components/BotSwitcher';

// BotSwitcher handles the header UI
function NengiHeader() {
    return <BotSwitcher currentBot="nengi" />;
}

export default async function HubPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Check for active project (for nav state)
    const projectCount = await prisma.project.count({
        where: { userId: user.id }
    });

    // Get latest project for Monji link
    const latestProject = await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
    });

    return (
        <SaasShell
            user={{ name: user.name, image: user.image }}
            hasActiveProject={projectCount > 0}
            fullWidth
            noPadding
            headerContent={<BotSwitcher currentBot="nengi" latestProjectId={latestProject?.id} />}
            hideBottomNav={true}
        >
            <HubChatInterface userName={user.name} immersiveMode={true} />
        </SaasShell>
    );
}
