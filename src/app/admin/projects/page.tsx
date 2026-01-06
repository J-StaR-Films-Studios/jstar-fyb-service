
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { AdminProjectCard } from "@/features/admin/components/AdminProjectCard";

// Force dynamic rendering to prevent static build failures
export const dynamic = 'force-dynamic';

async function getProjects() {
    const projects = await prisma.project.findMany({
        where: {
            isUnlocked: true
        },
        orderBy: { updatedAt: "desc" },
        include: {
            user: { select: { name: true, email: true } },
            _count: {
                select: { documents: true, messages: true }
            },
            payments: {
                where: { status: 'SUCCESS' },
                select: { amount: true }
            }
        }
    });

    return projects.map(p => ({
        ...p,
        totalPaid: p.payments.reduce((sum, pay) => sum + pay.amount, 0)
    }));
}

const STATUS_COLORS: Record<string, string> = {
    OUTLINE_GENERATED: "bg-gray-500",
    RESEARCH_IN_PROGRESS: "bg-blue-500",
    RESEARCH_COMPLETE: "bg-purple-500",
    WRITING_IN_PROGRESS: "bg-yellow-500",
    PROJECT_COMPLETE: "bg-green-500",
};

const MODE_COLORS: Record<string, string> = {
    DIY: "bg-gray-600",
    CONCIERGE: "bg-accent",
};

export default async function AdminProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="min-h-screen bg-dark text-white p-4 md:p-8 pb-32">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-display font-bold">Projects Dashboard</h1>
                    <p className="text-gray-400 text-sm md:text-base">Manage all paid projects</p>
                </header>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {projects.length === 0 ? (
                        <div className="text-center text-gray-500 py-12 bg-white/5 rounded-xl border border-white/5">
                            No paid projects yet.
                        </div>
                    ) : (
                        projects.map((project) => (
                            <Link key={project.id} href={`/admin/projects/${project.id}`}>
                                <AdminProjectCard project={project} />
                            </Link>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5">
                            <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                                <th className="px-6 py-4">Topic</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Mode</th>
                                <th className="px-6 py-4">Amount Paid</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Docs</th>
                                <th className="px-6 py-4">Messages</th>
                                <th className="px-6 py-4">Updated</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No paid projects yet.
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white truncate max-w-[200px]" title={project.topic}>
                                                {project.topic}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white">{project.user?.name || "Unknown"}</div>
                                            <div className="text-xs text-gray-500">{project.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${MODE_COLORS[project.mode] || "bg-gray-500"}`}>
                                                {project.mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-green-400 font-mono text-sm">
                                                ₦{project.totalPaid.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[project.status] || "bg-gray-500"}`}>
                                                {project.status.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {project._count.documents}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {project._count.messages}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {new Date(project.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/projects/${project.id}`}
                                                className="text-primary hover:underline text-sm font-medium"
                                            >
                                                View
                                            </Link>
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
