import { SettingsForm } from '@/features/admin/components/SettingsForm';
import { getLandingPageTimer } from '@/features/marketing/actions/marketing-actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const { startDate, targetDate } = await getLandingPageTimer();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">Manage global application configuration.</p>
            </div>

            <div className="space-y-8">
                <SettingsForm initialStart={startDate} initialEnd={targetDate} />
            </div>
        </div>
    );
}
