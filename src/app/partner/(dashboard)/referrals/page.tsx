
import { PrismaClient } from '@prisma/client';
import { getPartnerSession } from '@/lib/partner-auth';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export default async function ReferralsPage() {
    const session = await getPartnerSession();
    if (!session) redirect('/partner/login');

    const referrals = await prisma.user.findMany({
        where: { referredById: session.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
            payments: {
                where: { commission: { influencerId: session.id } },
                include: {
                    commission: true
                }
            }
        }
    });

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Referrals</h1>
                <p className="text-zinc-500">Track the users who signed up with your code.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 font-medium text-zinc-500">Date</th>
                                <th className="px-6 py-4 font-medium text-zinc-500">User</th>
                                <th className="px-6 py-4 font-medium text-zinc-500">Status</th>
                                <th className="px-6 py-4 font-medium text-zinc-500 text-right">Commission Earned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {referrals.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                        No referrals found.
                                    </td>
                                </tr>
                            ) : (
                                referrals.map((user) => {
                                    const totalEarned = user.payments.reduce((acc, curr) => {
                                        return acc + (curr.commission?.amount || 0);
                                    }, 0);

                                    const hasPaid = user.payments.length > 0;

                                    return (
                                        <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                                                        {user.name?.[0] || 'U'}
                                                    </div>
                                                    {(user.name || 'Anonymous').split(' ')[0]} ***
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${hasPaid
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {hasPaid ? 'Converted' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-white">
                                                ₦{totalEarned.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
