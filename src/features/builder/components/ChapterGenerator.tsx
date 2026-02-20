'use client';

import { Zap, Download } from 'lucide-react';
import { ChapterCard } from './ChapterCard';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { useChapterGeneration, CHAPTER_INFO } from '../hooks/useChapterGeneration';

interface ChapterGeneratorProps {
    projectId: string;
}

export function ChapterGenerator({ projectId }: ChapterGeneratorProps) {
    const {
        chapters,
        expandedChapter,
        setExpandedChapter,
        error,
        downloadModal,
        setDownloadModal,
        generateChapter,
        handleDownloadConfirm,
        completedCount,
        readyCount,
        getChapterStatus,
        getWordCount
    } = useChapterGeneration(projectId);

    return (
        <div className="space-y-6">
            {/* Header with Lightning Bolt Icon */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    </div>
                    <h2 className="text-2xl font-display font-bold">Generate Chapters</h2>
                    {readyCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase border border-green-500/30">
                            {readyCount}/5 Ready
                        </span>
                    )}
                </div>

                {completedCount > 0 && (
                    <button
                        onClick={() => setDownloadModal({ isOpen: true, target: 'all' })}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/30 rounded-xl text-accent hover:bg-accent/30 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download All ({completedCount})</span>
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Chapter Cards */}
            <div className="space-y-4">
                {CHAPTER_INFO.map((info) => {
                    const chapter = chapters[info.number];
                    const status = getChapterStatus(info.number);
                    const isExpanded = expandedChapter === info.number;

                    return (
                        <ChapterCard
                            key={info.number}
                            number={info.number}
                            title={chapter?.title || info.title}
                            description={info.description}
                            status={status}
                            wordCount={chapter?.content ? getWordCount(chapter.content) : undefined}
                            generatedTime={chapter?.content ? '2m ago' : undefined}
                            progress={chapter?.progress}
                            estimatedRemaining={chapter?.isGenerating ? '45s' : undefined}
                            estimatedWords={info.estimatedWords}
                            content={chapter?.content}
                            isExpanded={isExpanded}
                            onToggleExpand={() => setExpandedChapter(isExpanded ? null : info.number)}
                            onView={() => setExpandedChapter(isExpanded ? null : info.number)}
                            onDownload={() => setDownloadModal({ isOpen: true, target: 'single', chapter })}
                            onGenerate={() => generateChapter(info.number)}
                        />
                    );
                })}
            </div>

            <DownloadOptionsModal
                isOpen={downloadModal.isOpen}
                onClose={() => setDownloadModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleDownloadConfirm}
                title={downloadModal.target === 'all' ? 'Download Full Project' : 'Download Chapter'}
            />
        </div>
    );
}
