'use client';

import { Type, Clock, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exist

interface MobileTimelineViewProps {
    chapters?: any[]; // Replace with proper type later
    onChapterClick?: (id: string) => void;
}

export function MobileTimelineView({ chapters, onChapterClick }: MobileTimelineViewProps) {
    return (
        <div className="pb-28 w-full">
            {/* Hero Status Board */}
            <div className="pt-24 px-6 pb-8">
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Stat 1 */}
                    <div className="min-w-[120px] bg-writing border border-rule rounded-md p-4 flex flex-col justify-between h-28 relative overflow-hidden shrink-0">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-selection rounded-full -mr-8 -mt-8"></div>
                        <Type className="w-5 h-5 text-ink-muted" />
                        <div>
                            <span className="text-2xl font-margin font-bold text-ink">
                                {chapters?.reduce((acc, curr) => acc + (curr.wordCount || 0), 0).toLocaleString() ?? 0}
                            </span>
                            <p className="text-xs text-ink-muted uppercase tracking-wider font-bold mt-1">Words</p>
                        </div>
                    </div>
                    {/* Stat 2 */}
                    <div className="min-w-[120px] bg-writing border border-rule rounded-md p-4 flex flex-col justify-between h-28 relative overflow-hidden shrink-0">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-selection rounded-full -mr-8 -mt-8"></div>
                        <Clock className="w-5 h-5 text-ink-muted" />
                        <div>
                            <span className="text-2xl font-margin font-bold text-ink">
                                {Math.round(((chapters?.filter(c => (c.wordCount || 0) > 50).length || 0) / 5) * 100)}%
                            </span>
                            <p className="text-xs text-ink-muted uppercase tracking-wider font-bold mt-1">Complete</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="px-6 relative space-y-8 mt-4">

                {chapters?.map((chapter) => (
                    <div key={chapter.id} className={cn("relative pl-12 z-10", chapter.status === 'locked' && "opacity-60 grayscale")}>
                        {/* Timeline Connector - Simplified logic */}
                        <div className="absolute left-[23px] top-10 bottom-[-40px] w-px bg-rule -z-10"></div>

                        {/* Status Node */}
                        <div className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center">
                            {chapter.status === 'in-progress' || chapter.status === 'complete' || chapter.status === 'draft' ? (
                                <div className="w-10 h-10 rounded-full bg-rust flex items-center justify-center ring-4 ring-paper">
                                    <span className="font-bold text-sm text-writing font-margin">{chapter.number}</span>
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-writing border border-rule flex items-center justify-center">
                                    <span className="font-bold text-xs text-ink-muted">{chapter.number}</span>
                                </div>
                            )}
                        </div>

                        {/* Card Content */}
                        <div className={cn(
                            "bg-writing border border-rule p-5 rounded-md relative",
                            (chapter.status === 'in-progress' || chapter.status === 'draft') ? "border-rule" : ""
                        )}>
                            <div className="flex justify-between items-start mb-3">
                                <h2 className={cn("font-bold text-lg", chapter.status === 'locked' ? "text-ink-muted" : "text-ink")}>
                                    {chapter.title}
                                </h2>
                                {(chapter.status === 'in-progress' || chapter.status === 'draft') && (
                                    <span className="text-xs bg-selection text-rust px-2 py-0.5 rounded text-center font-bold">IN PROGRESS</span>
                                )}
                            </div>

                            {/* Details based on status */}
                            {chapter.status === 'locked' ? (
                                <>
                                    <div className="h-1 w-full bg-selection rounded-full mt-4 overflow-hidden">
                                        <div className="h-full bg-primary w-0"></div>
                                    </div>
                                    <p className="text-xs text-ink-muted mt-2">Locked • Complete previous chapter</p>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {chapter.subsections?.map((sub: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-selection rounded-lg -mx-2 transition-colors cursor-pointer group">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                            <span className="text-sm text-ink-muted group-hover:text-ink line-clamp-1">{sub}</span>
                                            <ChevronRight className="w-4 h-4 ml-auto text-ink-muted group-hover:text-rust" />
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => onChapterClick?.(chapter.id)}
                                        className="w-full mt-4 py-3 rounded-xl bg-selection hover:bg-paper text-sm font-bold flex items-center justify-center gap-2 border border-rule transition-all text-ink"
                                    >
                                        <Play className="w-4 h-4 fill-current" /> {chapter.subsections && chapter.subsections.length > 0 ? 'Continue Writing' : 'Start Writing'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
}
