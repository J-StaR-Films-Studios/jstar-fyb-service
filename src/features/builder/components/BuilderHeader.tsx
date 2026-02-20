'use client';

import { useBuilderLayout } from '../context/BuilderLayoutContext';
import { ProgressStepper } from './ProgressStepper';
import { ChevronLeft, BookOpen, MoreVertical } from 'lucide-react';
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

    // TODO: Get research count from store when research feature is implemented
    const researchCount = 0;

    return (
        <div className="flex items-center justify-between w-full gap-2">
            {/* Left Section: Back + Title + Save Status */}
            <div className="flex items-center gap-3 overflow-hidden shrink-0">
                {/* Back Button */}
                <Link
                    href="/dashboard"
                    className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0"
                    aria-label="Back to dashboard"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Link>

                {/* Title & Save Status */}
                <div className="flex flex-col justify-center overflow-hidden">
                    <h1 className="font-display font-bold text-sm text-white truncate max-w-[150px] md:max-w-md leading-tight">
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
                            "text-[10px] font-medium uppercase tracking-wide",
                            saveStatus === 'saving' ? 'text-yellow-400' :
                                saveStatus === 'error' ? 'text-red-400' : 'text-green-400'
                        )}>
                            {saveStatus === 'saving' ? 'Saving...' :
                                saveStatus === 'error' ? 'Error' : 'Saved'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Stepper - Center Section (hidden on mobile, shown as compact dots) */}
            <div className="hidden md:flex flex-1 justify-center px-4">
                <ProgressStepper />
            </div>

            {/* Mobile: Show compact stepper in the flow */}
            <div className="md:hidden flex-1 flex justify-center">
                <ProgressStepper />
            </div>

            {/* Right Section: Research Button + Menu */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Research Toggle Button */}
                <button
                    onClick={toggleResearchPanel}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    aria-label="Toggle research panel"
                >
                    <div className="relative">
                        <BookOpen className="w-4 h-4 text-accent group-hover:text-white transition-colors" />
                        {/* Badge dot - shows when there are research items */}
                        {researchCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-dark"></span>
                        )}
                    </div>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-white hidden sm:block">
                        Research
                    </span>
                    {/* Count badge */}
                    {researchCount > 0 && (
                        <span className="text-[10px] font-bold text-white bg-white/10 px-1.5 rounded ml-1">
                            {researchCount}
                        </span>
                    )}
                </button>

                {/* Menu Button (Mobile) */}
                <button
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors md:hidden"
                    aria-label="Open menu"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
