
import { PrismaClient } from '@prisma/client';
import { getPartnerSession } from '@/lib/partner-auth';
import { redirect } from 'next/navigation';
import SettingsForm from './_components/settings-form';

const prisma = new PrismaClient();

import { PaystackService } from '@/services/paystack.service';

export default async function SettingsPage() {
    const session = await getPartnerSession();
    if (!session) redirect('/partner/login');

    const influencer = await prisma.influencer.findUnique({
        where: { id: session.id },
        include: { payoutConfig: true }
    });

    if (!influencer) redirect('/partner/login');

    const banks = await PaystackService.listBanks();

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
                <p className="text-zinc-500">Manage your account and security preferences.</p>
            </div>

            <div className="max-w-4xl">
                <SettingsForm influencer={influencer} banks={banks} />
            </div>
        </div>
    );
}
