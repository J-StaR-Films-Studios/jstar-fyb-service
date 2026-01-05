import { HubChatInterface } from '@/features/bot/components/HubChatInterface';
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Nengi • J Star Hub',
    description: 'Your creative partner and brain dump.',
};

export default async function HubPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    return <HubChatInterface userName={user.name} />;
}
