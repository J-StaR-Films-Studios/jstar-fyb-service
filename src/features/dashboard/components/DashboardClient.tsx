"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/features/dashboard/components/ProjectCard";
import { ResourceDownloads } from "@/features/dashboard/components/ResourceDownloads";
import { UpsellBanner } from "@/features/dashboard/components/UpsellBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefresh } from "@/components/feedback/PullToRefresh";

interface DashboardClientProps {
  activeProject: any;
}

export function DashboardClient({ activeProject }: DashboardClientProps) {
  const router = useRouter();

  const { containerRef, isPulling, pullDistance, pullProgress, isRefreshing } =
    usePullToRefresh({
      onRefresh: async () => {
        router.refresh();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      threshold: 80,
    });

  return (
    <PullToRefresh
      isPulling={isPulling}
      pullDistance={pullDistance}
      pullProgress={pullProgress}
      isRefreshing={isRefreshing}
    >
      <div ref={containerRef} className="min-h-[calc(100vh-6rem)] relative space-y-8">
        {activeProject ? (
          <>
            <ProjectCard project={activeProject} />
            <ResourceDownloads documents={activeProject.documents} />
            <UpsellBanner />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 mb-6 rounded-md bg-selection flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-rust"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-3xl font-margin font-bold text-ink mb-3">
              No projects yet
            </h3>
            <p className="text-ink-muted max-w-sm mb-8 text-base leading-relaxed">
              Start your first project by choosing a topic. Your chapters and research will appear here as you work.
            </p>
            <a
              href="/project/builder"
              className="min-h-11 px-8 py-3 bg-rust hover:bg-rust/90 text-writing font-bold rounded-md transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-rust flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Start Your Project
            </a>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
