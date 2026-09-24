"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X, Layout } from "lucide-react";
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
        <div className="bg-writing p-5 md:p-8 rounded-md relative border border-rule text-ink">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-selection border border-rule text-xs text-ink font-semibold mb-4">
{displayStatus}
            </div>

            <Link href={`/project/${project.id}/workspace`} className="block group-hover:text-rust transition-colors">
                <h2 className="text-2xl font-bold font-margin mb-2 pr-8">{project.topic || "Untitled Project"}</h2>
            </Link>
            <p className="text-ink-muted text-sm mb-6 line-clamp-2">
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
                    className="min-h-11 py-3 bg-writing border border-rule rounded-md text-sm font-bold hover:bg-selection transition-colors flex items-center justify-center gap-2"
                >
                    <FileText className="w-4 h-4" /> Abstract
                </button>
                <Link
                    href={`/project/${project.id}/workspace`}
                    className="min-h-11 py-3 bg-rust border border-rust rounded-md text-sm font-bold text-writing hover:bg-rust/90 transition-colors flex items-center justify-center gap-2"
                >
                    <Layout className="w-4 h-4" /> Enter Workspace
                </Link>
            </div>

            {/* Abstract Modal - Rendered via Portal to escape parent clipping */}
            {showAbstract && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-writing text-ink p-6 md:p-8 rounded-md w-full max-w-3xl border border-rule relative max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowAbstract(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-selection text-ink-muted hover:text-ink transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6 shrink-0 pr-8">
                            <h3 className="text-2xl font-bold font-margin text-ink mb-1">Project Abstract</h3>
                            <p className="text-sm text-ink-muted">Full abstract content</p>
                        </div>

                        <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                            <p className="text-ink leading-relaxed text-base whitespace-pre-wrap">
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
