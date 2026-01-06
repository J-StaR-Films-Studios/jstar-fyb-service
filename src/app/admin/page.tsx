
import { prisma } from "@/lib/prisma";
import { Users, TrendingUp, AlertCircle, FileText, DollarSign, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getAdminStats() {
    const [
        totalProjects,
        totalLeads,
        pendingRequests,
        totalRevenue
    ] = await Promise.all([
        prisma.project.count(),
        prisma.lead.count(),
        prisma.topicSwitchRequest.count({ where: { status: 'pending' } }),
        prisma.payment.aggregate({
            where: { status: 'SUCCESS' },
            _sum: { amount: true }
        })
    ]);

    return {
        totalProjects,
        totalLeads,
        pendingRequests,
        revenue: totalRevenue._sum.amount || 0
    };
}

export default async function AdminDashboardPage() {
    const stats = await getAdminStats();

    return (
        <div className="min-h-screen bg-dark text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-display font-bold">Admin Overview</h1>
                    <p className="text-gray-400">System status and quick actions</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-primary/50 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                                <LayoutDashboard className="w-4 h-4" /> Projects
                            </div>
                            <div className="text-3xl font-display font-bold">{stats.totalProjects}</div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-green-500/50 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wider mb-2">
                                <DollarSign className="w-4 h-4" /> Revenue
                            </div>
                            <div className="text-3xl font-display font-bold">₦{(stats.revenue).toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                                <Users className="w-4 h-4" /> Leads
                            </div>
                            <div className="text-3xl font-display font-bold">{stats.totalLeads}</div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-wider mb-2">
                                <FileText className="w-4 h-4" /> Requests
                            </div>
                            <div className="text-3xl font-display font-bold">{stats.pendingRequests}</div>
                            {stats.pendingRequests > 0 && <p className="text-xs text-yellow-500/80 mt-1 font-mono">Pending Review</p>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            <Link href="/admin/projects" className="block p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                                <div className="font-bold text-sm">View Projects</div>
                                <div className="text-xs text-gray-500">Manage ongoing student projects</div>
                            </Link>
                            <Link href="/admin/leads" className="block p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                                <div className="font-bold text-sm">View Leads</div>
                                <div className="text-xs text-gray-500">Track and convert potential users</div>
                            </Link>
                            <Link href="/admin/requests" className="block p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                                <div className="font-bold text-sm">Topic Requests</div>
                                <div className="text-xs text-gray-500">Review switch applications</div>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">System Healthy</h3>
                        <p className="text-sm text-gray-400">All services are running normally.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
