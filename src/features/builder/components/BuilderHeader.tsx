'use client';

import { useEffect, useState } from 'react';
import { useBuilderLayout } from '../context/BuilderLayoutContext';
import { ChevronLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * BuilderHeader
 * 
 * The builder-specific header that replaces the default SaasShell header
 * when on the builder route. Shows:
 * - Left: Back button + project title + save status
 * - Center: Progress Stepper (Task 2)
 * - Right: Research button with badge + menu button (mobile)
 */

export function BuilderHeader() {
    const { projectData, saveStatus, toggleResearchPanel } = useBuilderLayout();

    // Get project title (truncate on mobile)
    const projectTitle = projectData.topic || 'Untitled Project';

    const [researchCount, setResearchCount] = useState(0);

    // Fetch initial document count 
    useEffect(() => {
        if (!projectData.projectId) return;
        const fetchCount = async () => {
            try {
                const res = await fetch(`/api/documents?projectId=${projectData.projectId}`);
                if (res.ok) {
                    const result = await res.json();
                    setResearchCount(result.documents?.length || 0);
                }
            } catch (err) {
                console.error('Failed to fetch research count', err);
            }
        };
        fetchCount();
    }, [projectData.projectId]);

    return (
        <header className="fixed top-0 w-full z-40 transition-all duration-300 backdrop-blur-md border-b border-rule bg-writing/95 h-16 flex items-center justify-between px-4">
            {/* Left Section: Back + Title + Save Status */}
            <div className="flex items-center gap-3 overflow-hidden shrink-0">
                {/* Back Button */}
                <Link
                    href="/dashboard"
                    className="p-2 -ml-2 text-ink-muted hover:text-rust transition-colors rounded-full hover:bg-selection shrink-0"
                    aria-label="Back to dashboard"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Link>

                {/* Title & Save Status */}
                <div className="flex flex-col justify-center overflow-hidden">
                    <span className="text-xs text-ink-muted font-margin-mono truncate">J-Star Projects</span>
                    <h1 className="font-margin font-bold text-sm text-ink truncate max-w-[150px] md:max-w-md leading-tight">
                        {projectTitle}
                    </h1>

                    {/* Save Status Indicator */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="relative flex h-2 w-2">
                            {saveStatus === 'saving' ? (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </>
                            ) : saveStatus === 'error' ? (
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            ) : (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </>
                            )}
                        </span>
                        <span className={cn(
                            "text-xs font-medium tracking-wide",
                            saveStatus === 'saving' ? 'text-ink-muted' :
                                saveStatus === 'error' ? 'text-ink' : 'text-ink-muted'
                        )}>
                            {saveStatus === 'saving' ? 'Saving...' :
                                saveStatus === 'error' ? 'Save error' : 'Ready to edit'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Section: Research Button + Menu */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Research Toggle Button */}
                <button
                    onClick={toggleResearchPanel}
                    className="flex items-center gap-2 px-3 min-h-11 rounded-md bg-writing border border-rule hover:bg-selection transition-colors group"
                    aria-label="Toggle research panel"
                >
                    <div className="relative">
                        <BookOpen className="w-4 h-4 text-rust" />
                    </div>
                    <span className="text-xs font-medium text-ink group-hover:text-rust hidden sm:block">
                        Research
                    </span>
                    {/* Count badge */}
                    {researchCount > 0 && (
                        <span className="text-xs font-bold text-ink bg-selection px-1.5 rounded ml-1">
                            {researchCount}
                        </span>
                    )}
                </button>

            </div>
        </header>
    );
}
