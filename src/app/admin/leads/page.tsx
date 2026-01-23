// @ts-nocheck
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AdminLeadCard } from '@/features/admin/components/AdminLeadCard';
import { SendPaymentLinkButton } from '@/features/admin/components/SendPaymentLinkButton';
import { MessageCircle, Phone, TrendingUp, Users, AlertCircle } from 'lucide-react';

function TierBadge({ tier }: { tier: string | null }) {
    if (!tier) return <span className="text-gray-500 text-xs text-muted-foreground">Via Jay</span>;

    const colors: Record<string, string> = {
        'AGENCY_SOFT_LIFE': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'AGENCY_DEFENSE_READY': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        'AGENCY_CODE_GO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'AGENCY_PAPER_PREMIUM': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'AGENCY_PAPER_DEFENSE': 'bg-green-500/20 text-green-400 border-green-500/30',
        'AGENCY_PAPER_EXPRESS': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    const tierLabel = tier.replace('AGENCY_', '').replace(/_/g, ' ');

    return (
        <span className={`px-2 py-1 rounded text-xs font-bold border whitespace-nowrap ${colors[tier] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {tierLabel}
        </span>
    );
}

export const dynamic = 'force-dynamic';

async function getStats() {
    // Simple stats aggregation
    const total = await prisma.lead.count();
    const newLeads = await prisma.lead.count({ where: { status: 'NEW' } });
    const soldLeads = await prisma.lead.count({ where: { status: { in: ['SOLD', 'PAID'] } } });

    return { total, newLeads, soldLeads };
}

export default async function AdminLeadsPage(props: { searchParams: Promise<{ page?: string }> }) {
    const searchParams = await props.searchParams;
    let leads: any[] = [];
    let stats = { total: 0, newLeads: 0, soldLeads: 0 };

    const page = Number(searchParams?.page) || 1;
    const pageSize = 50;

    try {
        const [leadsData, statsData] = await Promise.all([
            prisma.lead.findMany({
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip: (page - 1) * pageSize
            }),
            getStats()
        ]);
        leads = leadsData;
        stats = statsData;
    } catch (e) {
        console.error("DB Error", e);
    }

    return (
        <div className="min-h-screen bg-dark text-white p-4 md:p-8 font-sans pb-32">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Lead Capture Dashboard</h1>
                        <p className="text-muted-foreground">Manage and convert student project leads.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Total Leads
                        </div>
                        <div className="text-2xl font-bold font-display">{stats.total}</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                        <div className="text-blue-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> New
                        </div>
                        <div className="text-2xl font-bold font-display text-blue-400">{stats.newLeads}</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                        <div className="text-green-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Sold
                        </div>
                        <div className="text-2xl font-bold font-display text-green-400">{stats.soldLeads}</div>
                    </div>
                </div>

                {/* Mobile View (Cards) */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {leads.map(lead => (
                        <AdminLeadCard key={lead.id} lead={lead} />
                    ))}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto border border-white/10 rounded-xl relative">
                    <table className="w-full text-left bg-white/5">
                        <thead className="bg-white/10 text-gray-400 uppercase text-xs font-mono">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Tier</th>
                                <th className="p-4">Idea</th>
                                <th className="p-4">Complexity</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">No leads found yet.</td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                            <div className="text-xs opacity-50">{new Date(lead.createdAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-mono text-accent">{lead.whatsapp}</div>
                                            <div className="text-xs text-muted-foreground">{lead.department}</div>
                                        </td>
                                        <td className="p-4">
                                            <TierBadge tier={lead.tier} />
                                        </td>
                                        <td className="p-4 max-w-sm">
                                            <div className="font-bold text-sm truncate" title={lead.topic}>{lead.topic}</div>
                                            <div className="text-xs text-gray-400 truncate" title={lead.twist}>{lead.twist}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1">
                                                {[...Array(lead.complexity || 1)].map((_, i) => (
                                                    <div key={i} className={`w-1 h-3 rounded-full ${lead.complexity > 3 ? 'bg-red-500' : 'bg-green-500'}`} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${lead.status === 'NEW' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                lead.status === 'SOLD' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                                }`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" className="p-2 hover:text-green-400 transition-colors">
                                                    <MessageCircle className="w-4 h-4" />
                                                </a>
                                                <SendPaymentLinkButton leadId={lead.id} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center text-gray-400">
                    <div className="text-sm">Page {page}</div>
                    <div className="flex gap-2">
                        {page > 1 && (
                            <Link href={`/admin/leads?page=${page - 1}`} className="px-3 py-1 bg-white/5 rounded hover:bg-white/10">
                                Previous
                            </Link>
                        )}
                        {leads.length === pageSize && (
                            <Link href={`/admin/leads?page=${page + 1}`} className="px-3 py-1 bg-white/5 rounded hover:bg-white/10">
                                Next
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
