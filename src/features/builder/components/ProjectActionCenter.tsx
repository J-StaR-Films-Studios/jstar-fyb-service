import { ArrowRight, Bot, BookOpen, FileText, CheckCircle2, Layout } from "lucide-react";
import Link from "next/link";

interface ProjectActionCenterProps {
    projectId: string;
}

export function ProjectActionCenter({ projectId }: ProjectActionCenterProps) {
    return (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 sm:p-8 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] rounded-full" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-bold text-white">Project Unlocked</h3>
                        <p className="text-sm text-gray-400">All features are now available. Let's get to work.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {/* Action Card 1: Deep Research */}
                    {/* Action Card 1: Deep Research */}
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-5 opacity-60">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                <Bot className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-500 px-2 py-1 rounded-full">Coming Soon</span>
                        </div>
                        <h4 className="font-bold text-lg text-gray-200 mb-2">Deep Research</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Analyze your abstract and uploaded documents to find relevant citations and data points.
                        </p>
                    </div>

                    {/* Action Card 2: Chapter Writing */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 sm:p-5 opacity-60">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                                <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-500 px-2 py-1 rounded-full">Coming Soon</span>
                        </div>
                        <h4 className="font-bold text-lg text-gray-400 mb-2">Chapter Writing</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Generate full 2,000-word chapters based on the research findings.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <Link
                        href={`/project/${projectId}/workspace`}
                        className="flex-1 py-4 bg-primary hover:bg-primary/90 rounded-xl font-bold text-white uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        <Layout className="w-4 h-4" />
                        Open in Workspace
                    </Link>

                    <Link
                        href={`/project/${projectId}/workspace?tab=chat`}
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-gray-300 flex items-center justify-center gap-2 transition-all hover:border-purple-500/30 hover:text-purple-400"
                    >
                        <Bot className="w-4 h-4" />
                        Chat with Monji
                    </Link>
                </div>
            </div>
        </div>
    );
}
