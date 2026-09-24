'use client';

import { CheckCircle2, Lock, MoreHorizontal, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { memo } from 'react';


interface ChapterNodeProps {
    number: number;
    title: string;
    status: 'locked' | 'draft' | 'in-progress' | 'complete';
    subsections?: string[];
    isActive?: boolean;
    onSelect?: (number: number) => void;
    onGenerate?: (number: number) => void;
    isGenerating?: boolean;
    wordCount?: number;
}

const ChapterNode = memo(function ChapterNode({ number, title, status, subsections, isActive, onSelect, onGenerate, isGenerating, wordCount }: ChapterNodeProps) {
    // Show generate (always visible) if: draft/empty AND no content
    const showGenerate = (status === 'draft' || (status as string) === 'empty') && !isGenerating && onGenerate && (!wordCount || wordCount < 30);
    // Show regenerate (on hover) if: has content AND not currently generating
    const showRegenerate = !showGenerate && !isGenerating && onGenerate && wordCount && wordCount >= 30;

    const handleClick = () => {
        if (status !== 'locked' && onSelect) {
            onSelect(number);
        }
    };

    const handleGenerate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onGenerate) {
            onGenerate(number);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "group rounded-md p-3 transition-colors border-l-[3px] border-transparent relative",
                isActive ? "bg-selection border-rust cursor-default" :
                    status === 'locked' ? "text-ink-muted cursor-not-allowed" : "hover:bg-selection cursor-pointer"
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={cn(
                    "text-xs font-bold",
                    isActive ? "text-rust" : "text-ink-muted"
                )}>
                    Chapter {number}
                </span>

                <div className="flex items-center gap-2">
                    {/* Status Icons */}
                    {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {status === 'locked' && <Lock className="w-3 h-3 text-ink-muted" />}

                    {/* Generate Button - Always visible for empty chapters */}
                    {showGenerate && (
                        <button
                            onClick={handleGenerate}
                            className="bg-selection hover:bg-paper min-w-11 min-h-11 flex items-center justify-center rounded-md text-rust transition-colors"
                            title="Generate Chapter with AI"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Regenerate Button - Shows on hover for chapters with content */}
                    {showRegenerate && (
                        <button
                            onClick={handleGenerate}
                            className="bg-selection hover:bg-paper min-w-11 min-h-11 flex items-center justify-center rounded-md text-rust transition-colors"
                            title="Regenerate Chapter (will replace existing content)"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Generating Spinner */}
                    {(isGenerating || (status === 'in-progress' && !isActive)) && (
                        <Loader2 className="w-4 h-4 text-rust animate-spin" />
                    )}

                    {isActive && <MoreHorizontal className="w-4 h-4 text-rust/50 group-hover:text-rust cursor-pointer" />}
                </div>
            </div>

            <h3 className={cn(
                "font-bold text-sm mb-1",
                isActive ? "text-ink" : "text-ink"
            )}>
                {/* Only show title if it's not just "Chapter N" (avoid duplication) */}
                {title.toLowerCase().startsWith('chapter') ? null : title}
            </h3>

            {isActive && subsections && (
                <div className="space-y-1 pl-2 border-l border-rule mt-2">
                    {subsections.map((sub, idx) => (
                        <p key={idx} className="text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer flex items-center gap-2">
                            <span>{sub}</span>
                        </p>
                    ))}
                </div>
            )}

            {status === 'in-progress' && !isActive && !isGenerating && (
                <div className="w-full h-1 bg-selection rounded-full mt-2">
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
        <aside className="w-64 xl:w-72 flex flex-col z-20 h-full border-r border-rule bg-paper text-ink">
            {/* Brand Header */}
            <Link href="/dashboard" className="h-16 flex items-center px-6 border-b border-rule shrink-0 hover:bg-selection transition-colors group">
                <div className="w-8 h-8 bg-rust rounded-md flex items-center justify-center font-margin font-bold text-writing mr-3">
                    J
                </div>
                <div className="flex flex-col">
                    <span className="font-margin font-bold text-base text-ink tracking-wide">J-Star Projects</span>
                    <span className="text-xs text-ink-muted font-bold uppercase tracking-wider group-hover:text-rust transition-colors">← Dashboard</span>
                </div>
            </Link>

            {/* Project Info */}
            <div className="p-6 border-b border-rule shrink-0">
                <span className="text-xs text-ink-muted font-bold uppercase tracking-wider mb-2 block">Current Project</span>
                <h2 className="text-ink font-bold leading-tight mb-2 line-clamp-2">{projectTitle || 'Loading Project...'}</h2>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-ink-muted">
                        {chapters.reduce((acc, c) => acc + (c.wordCount || 0), 0).toLocaleString()} words
                    </span>
                    <span className="text-ink-muted">•</span>
                    <span className="text-rust font-bold">
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
