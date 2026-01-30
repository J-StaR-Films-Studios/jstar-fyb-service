'use client';

import { LucideIcon, CheckCircle2, Lock, MoreHorizontal, ChevronRight, Circle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ChapterNodeProps {
    number: number;
    title: string;
    status: 'locked' | 'draft' | 'in-progress' | 'complete';
    subsections?: string[];
    isActive?: boolean;
    onSelect: (id: number) => void;
    onGenerate?: (id: number) => void;
    isGenerating?: boolean;
    wordCount?: number;
}

const ChapterNode = memo(function ChapterNode({ number, title, status, subsections, isActive, onSelect, onGenerate, isGenerating, wordCount }: ChapterNodeProps) {
    // Show generate (always visible) if: draft/empty AND no content
    const showGenerate = (status === 'draft' || (status as string) === 'empty') && !isGenerating && onGenerate && (!wordCount || wordCount < 30);
    // Show regenerate (on hover) if: has content AND not currently generating
    const showRegenerate = !showGenerate && !isGenerating && onGenerate && wordCount && wordCount >= 30;

    return (
        <div
            onClick={status !== 'locked' ? () => onSelect(number) : undefined}
            className={cn(
                "group rounded-xl p-3 transition-all border border-transparent relative",
                isActive ? "bg-primary/10 border-primary/20 cursor-default" :
                    status === 'locked' ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5 hover:border-white/5 cursor-pointer"
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={cn(
                    "text-xs font-bold",
                    isActive ? "text-primary" : "text-gray-500"
                )}>
                    Chapter {number}
                </span>

                <div className="flex items-center gap-2">
                    {/* Status Icons */}
                    {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {status === 'locked' && <Lock className="w-3 h-3 text-gray-600" />}

                    {/* Generate Button - Always visible for empty chapters */}
                    {showGenerate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onGenerate?.(number);
                            }}
                            className="bg-primary/20 hover:bg-primary/30 p-1.5 rounded-lg text-primary transition-all hover:scale-110"
                            title="Generate Chapter with AI"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Regenerate Button - Shows on hover for chapters with content */}
                    {showRegenerate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onGenerate?.(number);
                            }}
                            className="bg-orange-500/10 hover:bg-orange-500/20 p-1.5 rounded-lg text-orange-400 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                            title="Regenerate Chapter (will replace existing content)"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Generating Spinner */}
                    {(isGenerating || (status === 'in-progress' && !isActive)) && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    )}

                    {isActive && <MoreHorizontal className="w-4 h-4 text-primary/50 group-hover:text-primary cursor-pointer" />}
                </div>
            </div>

            <h3 className={cn(
                "font-bold text-sm mb-1",
                isActive ? "text-white" : "text-gray-300"
            )}>
                {/* Only show title if it's not just "Chapter N" (avoid duplication) */}
                {title.toLowerCase().startsWith('chapter') ? null : title}
            </h3>

            {isActive && subsections && (
                <div className="space-y-1 pl-2 border-l border-primary/20 mt-2">
                    {subsections.map((sub, idx) => (
                        <p key={idx} className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                            <span>{sub}</span>
                        </p>
                    ))}
                </div>
            )}

            {status === 'in-progress' && !isActive && !isGenerating && (
                <div className="w-full h-1 bg-white/5 rounded-full mt-2">
                    <div className="w-1/3 h-full bg-gray-600 rounded-full"></div>
                </div>
            )}
        </div>
    );
});

export interface TimelineSidebarProps {
    projectTitle?: string;
    chapters: {
        number: number;
        title: string;
        status: 'locked' | 'draft' | 'in-progress' | 'complete';
        subsections?: string[];
        wordCount?: number;
        content?: string;
    }[];
    activeChapterNumber: number;
    onChapterSelect: (number: number) => void;
    onGenerateChapter?: (number: number) => void;
}

// Bolt: Memoized to prevent re-renders when parent state (like search query or active tab) changes
export const TimelineSidebar = memo(function TimelineSidebar({ projectTitle, chapters, activeChapterNumber, onChapterSelect, onGenerateChapter }: TimelineSidebarProps) {
    return (
        <aside className="w-80 flex flex-col glass-panel z-20 h-full border-r border-white/5 bg-dark/50 backdrop-blur-xl">
            {/* Brand Header */}
            <Link href="/dashboard" className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 hover:bg-white/5 transition-colors group">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-white mr-3 group-hover:scale-105 transition-transform">
                    J
                </div>
                <div className="flex flex-col">
                    <span className="font-display font-bold text-lg text-white tracking-wide">J Star</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-primary transition-colors">← Dashboard</span>
                </div>
            </Link>

            {/* Project Info */}
            <div className="p-6 border-b border-white/5 shrink-0">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Current Project</span>
                <h2 className="text-white font-bold leading-tight mb-2 line-clamp-2">{projectTitle || 'Loading Project...'}</h2>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">
                        {chapters.reduce((acc, c) => acc + (c.wordCount || 0), 0).toLocaleString()} words
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-primary font-bold">
                        {Math.round((chapters.filter(c => (c.wordCount || 0) > 50).length / 5) * 100)}% complete
                    </span>
                </div>
            </div>

            {/* Timeline / Chapters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {chapters.map((chapter) => (
                    <ChapterNode
                        key={chapter.number}
                        number={chapter.number}
                        title={chapter.title}
                        status={chapter.status}
                        subsections={chapter.subsections}
                        isActive={chapter.number === activeChapterNumber}
                        onSelect={onChapterSelect}
                        onGenerate={onGenerateChapter}
                        isGenerating={chapter.status === 'in-progress' && (!chapter.wordCount || chapter.wordCount < 10)}
                        wordCount={chapter.wordCount}
                    />
                ))}
            </div>
        </aside>
    );
});
