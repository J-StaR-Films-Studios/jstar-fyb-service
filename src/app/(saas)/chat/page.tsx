import { ChatInterface } from '@/features/bot/components/ChatInterface';
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { redirect } from 'next/navigation';

export default async function ChatPage() {
    const user = await getCurrentUser();

    if (!user) {
        return <ChatInterface initialUser={null} />;
    }

    // Check if user has any active projects
    const hasActiveProject = await prisma.project.count({
        where: { userId: user.id }
    }) > 0;

    // If they have a project, they should use the Hub (Nengi)
    // "Jay" is primarily for onboarding new users
    if (hasActiveProject) {
        redirect('/hub');
    }

    return <ChatInterface initialUser={user} />;
}
