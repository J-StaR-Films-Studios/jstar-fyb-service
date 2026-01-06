"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Cpu, FileText, Lock, X, Layout } from "lucide-react";
import { StatusTimeline } from "./StatusTimeline";
import Link from "next/link";

import { Project } from "@prisma/client";

interface ProjectCardProps {
    project: Partial<Project> & {
        chapters?: {
            id: string;
            number: number;
            status: string;
            wordCount: number;
            updatedAt: Date;
        }[];
    };
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
    const [showAbstract, setShowAbstract] = useState(false);
    // Dynamic Status Calculation
    const getDynamicStatus = () => {
        if (!project.chapters || project.chapters.length === 0) return project.status || "Active";

        // Find the "deepest" chapter that has progress
        // Filter chapters that have content (>20 words)
        const activeChapters = project.chapters.filter((c) => (c.wordCount || 0) > 20);

        if (activeChapters.length === 0) return project.status || "Outline Ready";
        if (activeChapters.length === 5) return "Project Complete";

        // Return latest chapter being worked on
        const lastActive = activeChapters[activeChapters.length - 1];
        return `Writing Chapter ${lastActive.number}`;
    };

    const displayStatus = getDynamicStatus();

    return (
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="absolute top-0 right-0 p-4 opacity-50">
                <Cpu className="w-24 h-24 text-white/5 -rotate-12" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-500 font-bold uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {displayStatus}
            </div>

            <Link href={`/project/${project.id}/workspace`} className="block group-hover:text-primary transition-colors">
                <h2 className="text-2xl font-bold font-display mb-2 pr-8">{project.topic || "Untitled Project"}</h2>
            </Link>
            <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                {project.abstract || "No abstract available."}
            </p>

            {/* Status Timeline */}
            <StatusTimeline
                status={project.status || "NEW"}
                progress={project.progressPercentage || 0}
                customLabel={displayStatus} // Pass dynamic writing status
            />

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3">
                <button
                    onClick={() => setShowAbstract(true)}
                    className="py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <FileText className="w-4 h-4" /> Abstract
                </button>
                <Link
                    href={`/project/${project.id}/workspace`}
                    className="py-3 bg-primary/10 border border-primary/20 rounded-xl text-sm font-bold text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                    <Layout className="w-4 h-4" /> Enter Workspace
                </Link>
            </div>

            {/* Abstract Modal - Rendered via Portal to escape parent clipping */}
            {showAbstract && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="glass-panel p-6 md:p-8 rounded-3xl w-full max-w-3xl border border-white/10 relative max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowAbstract(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6 shrink-0 pr-8">
                            <h3 className="text-2xl font-bold font-display text-white mb-1">Project Abstract</h3>
                            <p className="text-sm text-gray-400">Full abstract content</p>
                        </div>

                        <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                            <p className="text-gray-300 leading-relaxed text-base whitespace-pre-wrap">
                                {project.abstract || "No abstract available for this project."}
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
