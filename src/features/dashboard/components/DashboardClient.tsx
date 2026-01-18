'use client';

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/features/dashboard/components/ProjectCard";
import { ResourceDownloads } from "@/features/dashboard/components/ResourceDownloads";
import { UpsellBanner } from "@/features/dashboard/components/UpsellBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";

interface DashboardClientProps {
    activeProject: any; // We can improve typing later or infer from Prisma
}

export function DashboardClient({ activeProject }: DashboardClientProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    const { isRefreshing } = usePullToRefresh(containerRef, async () => {
        router.refresh();
        // Wait a bit to let the refresh happen visually
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    return (
        <div ref={containerRef} className="min-h-[calc(100vh-6rem)] relative">
            {isRefreshing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-dark/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-medium text-white">Refreshing...</span>
                </div>
            )}

            {activeProject ? (
                <>
                    <ProjectCard project={activeProject} />
                    <ResourceDownloads documents={activeProject.documents} />
                    <UpsellBanner />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                    <div className="w-20 h-20 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white mb-3">No projects yet</h3>
                    <p className="text-gray-400 max-w-xs mb-8 text-sm leading-relaxed">
                        Start your first project and let us help you dominate your final year.
                    </p>
                    <a
                        href="/project/builder"
                        className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Start Your Project
                    </a>
                </div>
            )}
        </div>
    );
}
