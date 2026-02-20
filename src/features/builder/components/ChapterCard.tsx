'use client';

import { CheckCircle2, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export type ChapterStatus = 'complete' | 'generating' | 'queued';

export interface ChapterCardProps {
    number: number;
    title: string;
    description?: string;
    status: ChapterStatus;
    wordCount?: number;
    generatedTime?: string;
    progress?: number;
    estimatedRemaining?: string;
    estimatedWords?: number;
    content?: string;
    onGenerate?: () => void;
    onView?: () => void;
    onDownload?: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

// Status pill styles
const statusPillStyles = {
    complete: 'bg-green-500/10 text-green-400 border border-green-500/20',
    generating: 'bg-primary/10 text-purple-400 border border-primary/20',
    queued: 'bg-white/5 text-gray-400 border border-white/10',
};

// Border styles
const borderStyles = {
    complete: 'border-l-green-500',
    generating: 'border-l-primary',
    queued: 'border-white/5',
};

// Icon background styles
const iconStyles = {
    complete: 'bg-green-500/10 text-green-400 border-green-500/20',
    generating: 'bg-primary/10 text-primary border-primary/20 animate-pulse',
    queued: 'bg-white/5 text-gray-500 border-white/10',
};

export function ChapterCard({
    number,
    title,
    description,
    status,
    wordCount,
    generatedTime,
    progress,
    estimatedRemaining,
    estimatedWords,
    content,
    onGenerate,
    onView,
    onDownload,
    isExpanded,
    onToggleExpand,
}: ChapterCardProps) {
    const isComplete = status === 'complete';
    const isGenerating = status === 'generating';
    const isQueued = status === 'queued';

    return (
        <div
            className={`
                glass-panel p-5 rounded-xl border-l-[3px] flex flex-col md:flex-row 
                items-start md:items-center justify-between gap-4 group
                ${borderStyles[status]}
                ${isQueued ? 'opacity-60 hover:opacity-100 transition-opacity' : 'hover:bg-white/[0.02] transition-colors'}
                relative overflow-hidden
            `}
        >
            {/* Progress bar for generating state */}
            {isGenerating && (
                <div className="absolute bottom-0 left-0 h-[2px] bg-primary/20 w-full">
                    <div
                        className="h-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse"
                        style={{ width: `${progress || 0}%` }}
                    />
                </div>
            )}

            {/* Gradient hover effect for complete */}
            {isComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}

            {/* Left side: Icon + Info */}
            <button
                onClick={isComplete ? onToggleExpand : undefined}
                className={`flex items-start gap-4 w-full md:flex-1 text-left ${!isComplete ? 'cursor-default' : ''}`}
                disabled={!isComplete}
            >
                {/* Icon */}
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 border
                    ${iconStyles[status]}
                    ${isGenerating ? 'animate-spin-slow' : ''}
                `}>
                    {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <span className="font-mono text-sm">{String(number).padStart(2, '0')}</span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-display font-bold text-lg ${isQueued ? 'text-gray-300' : 'text-white'}`}>
                            Chapter {number}: {title}
                        </h3>
                        <span className={`status-pill ${status === 'complete' ? 'status-complete' : status === 'generating' ? 'status-generating' : 'status-queued'}`}>
                            {isGenerating ? 'Generating...' : isComplete ? 'Complete' : 'Queued'}
                        </span>
                    </div>

                    <p className={`text-sm ${isQueued ? 'text-gray-500' : 'text-gray-400'} line-clamp-1`}>
                        {description}
                    </p>

                    {/* Metadata */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {isComplete && wordCount && (
                            <span className="text-xs text-gray-500 font-mono">
                                {wordCount.toLocaleString()} words {generatedTime && `· Generated ${generatedTime}`}
                            </span>
                        )}
                        {isGenerating && (
                            <>
                                <span className="text-xs text-primary font-bold">{progress || 0}%</span>
                                {estimatedRemaining && (
                                    <span className="text-xs text-gray-500">Est. {estimatedRemaining} remaining</span>
                                )}
                            </>
                        )}
                        {isQueued && estimatedWords && (
                            <span className="text-xs text-gray-600 font-mono">~{estimatedWords.toLocaleString()} words estimated</span>
                        )}
                    </div>
                </div>
            </button>

            {/* Right side: Action button */}
            <div className="w-full md:w-auto md:ml-4">
                {isComplete ? (
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="p-2 text-gray-400 hover:text-accent transition-colors"
                                title="Download options"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={onView}
                            className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium w-full md:w-auto"
                        >
                            View Content
                        </button>
                    </div>
                ) : isGenerating ? (
                    <div className="px-6 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium w-full md:w-auto text-center">
                        <Loader2 className="w-4 h-4 inline-block animate-spin mr-2" />
                        Generating...
                    </div>
                ) : (
                    <button
                        onClick={onGenerate}
                        className="px-6 py-2 rounded-lg border border-white/5 bg-white/5 text-gray-500 text-sm font-medium cursor-not-allowed w-full md:w-auto"
                        disabled
                    >
                        Queue
                    </button>
                )}
            </div>

            {/* Expanded content for complete state */}
            {isComplete && isExpanded && content && (
                <div className="w-full md:w-[calc(100%-200px)] mt-4 pt-4 border-t border-white/5">
                    <div className="prose prose-invert prose-sm max-w-none max-h-[400px] overflow-y-auto">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}
