'use client';

import { ReactNode } from 'react';
import { useBuilderStore } from "@/features/builder/store/useBuilderStore";
import { SaveIndicator } from "@/components/feedback/SaveIndicator";

interface ProjectWorkspaceLayoutProps {
    children: ReactNode;
}

export function ProjectWorkspaceLayout({ children }: ProjectWorkspaceLayoutProps) {
    const { data, saveStatus, lastSavedAt } = useBuilderStore();

    return (
        <div className="flex h-screen w-full bg-dark text-gray-300 overflow-hidden font-sans">

            {/* Desktop Left Sidebar: Hidden on mobile */}
            <div className="hidden md:flex shrink-0 h-full">

            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative h-full w-full">

                {/* Mobile Header: Hidden on desktop */}
                <header className="md:hidden fixed top-0 w-full z-40 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-dark to-transparent pointer-events-none">
                    <div className="flex flex-col pointer-events-auto">
                        <span className="text-xs text-gray-400 font-medium">Project Workspace</span>
                        <h1 className="font-display font-bold text-lg leading-tight text-white line-clamp-1">
                            {data.topic || "New Project"}
                        </h1>
                    </div>
                    <div className="pointer-events-auto">
                        <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt && new Date(lastSavedAt)} className="glass-panel rounded-full px-3 py-1" />
                    </div>
                </header>

                {/* Content: Full height, scrolling allowed inside */}
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>

                {/* Mobile Navigation: Hidden on desktop */}
                <div className="md:hidden">

                </div>

            </main>

            {/* Desktop Right Sidebar (Context): Placeholder for now */}
            <aside className="hidden lg:flex w-96 flex-col glass-panel border-l border-white/5 bg-dark/95 backdrop-blur-xl z-20">
                <div className="flex border-b border-white/5">
                    <button className="flex-1 py-4 text-sm font-bold border-b-2 border-primary text-white">Research</button>
                    <button className="flex-1 py-4 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-300">AI Chat</button>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    Select a section to see context
                </div>
            </aside>

        </div>
    );
}
