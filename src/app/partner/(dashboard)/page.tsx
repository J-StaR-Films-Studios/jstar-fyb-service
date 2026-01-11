
import { PrismaClient } from '@prisma/client';
import { getPartnerSession } from '@/lib/partner-auth';
import { redirect } from 'next/navigation';
import { DollarSign, Users, CreditCard, TrendingUp } from 'lucide-react';

const prisma = new PrismaClient();

export default async function PartnerDashboard() {
    const session = await getPartnerSession();
    if (!session) redirect('/partner/login');

    const influencer = await prisma.influencer.findUnique({
        where: { id: session.id },
    });

    if (!influencer) redirect('/partner/login');

    const totalReferrals = await prisma.user.count({
        where: { referredById: influencer.id }
    });

    const payingReferrals = await prisma.user.count({
        where: {
            referredById: influencer.id,
            payments: {
                some: {
                    status: 'SUCCESS'
                }
            }
        }
    });

    const conversionRate = totalReferrals > 0
        ? ((payingReferrals / totalReferrals) * 100).toFixed(1)
        : '0.0';

    const recentReferrals = await prisma.user.findMany({
        where: { referredById: influencer.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            payments: {
                where: { commission: { influencerId: influencer.id } }
            }
        }
    });

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Dashboard</h1>
                <p className="text-zinc-500">Overview of your partner usage and earnings.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Earnings"
                    value={`₦${influencer.totalEarnings.toLocaleString()}`}
                    icon={DollarSign}
                />
                <StatCard
                    title="Pending Payout"
                    value={`₦${influencer.pendingPayout.toLocaleString()}`}
                    description={influencer.pendingPayout > 0 ? "Request payout available" : "No pending funds"}
                    icon={CreditCard}
                />
                <StatCard
                    title="Total Referrals"
                    value={totalReferrals.toString()}
                    icon={Users}
                />
                <StatCard
                    title="Conversion"

                    value={`${conversionRate}%`}
                    description="From click to payment"
                    icon={TrendingUp}
                />
            </div>

            {/* Recent Referrals */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Referrals</h3>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {recentReferrals.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            No referrals yet. Share your code <strong>{influencer.referralCode}</strong>!
                        </div>
                    ) : (
                        recentReferrals.map((user) => {
                            const totalPaid = user.payments.length > 0;
                            return (
                                <div key={user.id} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-500">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {(user.name || 'Anonymous').split(' ')[0]} ***
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalPaid
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                        {totalPaid ? 'Converted' : 'Joined'}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, description, icon: Icon }: { title: string; value: string; description?: string; icon: any }) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-500">{title}</h3>
                <Icon className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
            {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
        </div>
    );
}
