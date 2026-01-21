import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Download, Search, CheckCircle, XCircle, Clock } from "lucide-react";

// Force dynamic rendering to prevent static build failures
export const dynamic = 'force-dynamic';

// Admin check helper
async function checkAdmin() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((user as any).role !== 'ADMIN') {
        redirect("/dashboard");
    }

    return user;
}

export default async function AdminPaymentsPage() {
    await checkAdmin();

    // Bolt Optimization: Use aggregate for stats and limit list fetch
    // This prevents fetching thousands of records just to calculate totals
    const [revenueStats, totalCount, payments] = await Promise.all([
        prisma.payment.aggregate({
            _sum: { amount: true },
            _count: { _all: true },
            where: { status: 'SUCCESS' }
        }),
        prisma.payment.count(),
        prisma.payment.findMany({
            take: 100, // Limit to prevent OOM
            include: {
                user: true,
                project: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    ]);

    const totalRevenue = revenueStats._sum.amount || 0;
    const successRate = totalCount > 0
        ? (revenueStats._count._all / totalCount) * 100
        : 0;

    return (
        <div className="min-h-screen bg-[#030014] text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold font-display mb-2">Payment History</h1>
                        <p className="text-gray-400">Monitor recent transactions and total revenue</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[200px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-400">
                                ₦{totalRevenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[150px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Success Rate</p>
                            <p className="text-2xl font-bold text-blue-400">
                                {successRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table Panel */}
                <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search reference..."
                                className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 w-64"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors">
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">User</th>
                                    <th className="p-4 font-medium">Project</th>
                                    <th className="p-4 font-medium">Reference</th>
                                    <th className="p-4 font-medium text-right">Amount</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors text-sm">
                                        <td className="p-4 text-gray-400 whitespace-nowrap">
                                            {format(payment.createdAt, 'MMM d, yyyy HH:mm')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                    {payment.user.name?.[0] || 'U'}
                                                </div>
                                                <span className="text-white">{payment.user.name || payment.user.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300 max-w-[200px] truncate" title={payment.project.topic}>
                                            {payment.project.topic}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-gray-500">
                                            {payment.reference}
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                            ₦{payment.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${payment.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                payment.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {payment.status === 'SUCCESS' && <CheckCircle className="w-3 h-3" />}
                                                {payment.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                                {payment.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500">
                                            No payments found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {payments.length >= 100 && (
                            <div className="p-4 text-center text-xs text-gray-500 border-t border-white/5 bg-white/[0.02]">
                                Showing last 100 payments only.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
