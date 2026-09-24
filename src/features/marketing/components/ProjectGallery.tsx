'use client';

import { useState } from 'react';
import { ProjectDetail, ProjectDetailModal } from './ProjectDetailModal';
import { PROJECTS } from '../data/projects';

export function ProjectGallery() {
    const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
    const handleNext = () => {
        if (!selectedProject) return;
        const index = PROJECTS.findIndex(p => p.id === selectedProject.id);
        setSelectedProject(PROJECTS[(index + 1) % PROJECTS.length]);
    };
    const handlePrev = () => {
        if (!selectedProject) return;
        const index = PROJECTS.findIndex(p => p.id === selectedProject.id);
        setSelectedProject(PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length]);
    };

    return (
        <section id="showcase" className="border-t border-rule py-16 md:py-20">
            <div className="mx-auto max-w-[1200px] px-5 md:px-8">
                <p className="mb-3 font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">Project ideas</p>
                <h2 className="text-3xl font-bold text-ink md:text-4xl">Explore possible directions</h2>
                <p className="mt-4 max-w-[65ch] text-ink-muted">Illustrative concepts to help you think about your own project. These are not verified student work or completed case studies.</p>
                <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {PROJECTS.map(project => (
                        <button key={project.id} type="button" onClick={() => setSelectedProject(project)} className="flex min-h-52 flex-col items-start rounded-md border border-rule bg-writing p-6 text-left hover:border-ink">
                            <span className="font-margin-mono text-xs font-medium text-ink-muted">{project.category}</span>
                            <span className="mt-5 text-xl font-bold text-ink">{project.title}</span>
                            <span className="mt-auto pt-6 text-sm font-semibold text-rust underline underline-offset-4">View concept</span>
                        </button>
                    ))}
                </div>
            </div>
            <ProjectDetailModal project={selectedProject} isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} onNext={handleNext} onPrev={handlePrev} />
        </section>
    );
}
