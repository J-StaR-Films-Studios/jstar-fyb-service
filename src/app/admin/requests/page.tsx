
import { prisma } from "@/lib/prisma";
import { RequestRowActions } from "./RequestRowActions";
import { AdminRequestCard } from "@/features/admin/components/AdminRequestCard";
import { ProofModal } from "@/features/admin/components/ProofModal";

export const dynamic = 'force-dynamic';

async function getRequests() {
    return prisma.topicSwitchRequest.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

export default async function AdminRequestsPage() {
    const requests = await getRequests();

    // Manual hydration
    const projectIds = requests.map(r => r.projectId);
    const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, topic: true, user: { select: { name: true, email: true } } }
    });

    const requestsWithData = requests.map(r => {
        const p = projects.find(proj => proj.id === r.projectId);
        return {
            ...r,
            project: { topic: p?.topic || "Unknown Project" },
            user: { name: p?.user?.name || "Unknown User", email: p?.user?.email || "No Email" }
        };
    });

    return (
        <div className="min-h-screen bg-dark text-white p-4 md:p-8 pb-32">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-display font-bold">Switch Requests</h1>
                    <p className="text-gray-400 text-sm md:text-base">Review topic switch applications</p>
                </header>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {requestsWithData.length === 0 ? (
                        <div className="text-center text-gray-500 py-12 bg-white/5 rounded-xl border border-white/5">
                            No requests found.
                        </div>
                    ) : (
                        requestsWithData.map((req) => (
                            <AdminRequestCard key={req.id} request={req} />
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 text-left">User</th>
                                <th className="px-6 py-4 text-left">Topic & Reason</th>
                                <th className="px-6 py-4 text-left">Proof</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {requestsWithData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No requests found.
                                    </td>
                                </tr>
                            ) : (
                                requestsWithData.map((req) => (
                                    <tr key={req.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{req.user.name}</div>
                                            <div className="text-xs text-gray-500">{req.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white mb-1 line-clamp-1" title={req.project.topic}>
                                                {req.project.topic}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold
                                                    ${req.reason === 'lecturer_rejected' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}
                                                `}>
                                                    {req.reason.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {req.proofUrl ? (
                                                <ProofModal proofUrl={req.proofUrl} />
                                            ) : (
                                                <span className="opacity-50">No proof</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                                ${req.status === 'approved' ? 'bg-green-500 text-black' :
                                                    req.status === 'denied' ? 'bg-red-500 text-white' :
                                                        'bg-yellow-500 text-black'}
                                            `}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <RequestRowActions requestId={req.id} currentStatus={req.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
