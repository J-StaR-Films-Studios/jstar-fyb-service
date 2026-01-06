'use client';

import { SkeletonChapter } from '@/components/ui/Skeleton';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { generateMarkdownBlob, generateDocxBlob, downloadFile, sanitizeFilename } from '@/lib/export-service';
import { Download } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Chapter {
    title?: string;
    content?: string;
}

interface OutlinePreviewProps {
    displayTitle: string;
    abstractPreview: string;
    displayChapters: (Chapter | undefined)[];
    isStreaming: boolean;
}

/**
 * Displays the project outline preview with title, abstract, and chapter list.
 * Handles streaming skeleton states during generation.
 */
export function OutlinePreview({
    displayTitle,
    abstractPreview,
    displayChapters,
    isStreaming
}: OutlinePreviewProps) {
    const [showExportModal, setShowExportModal] = useState(false);

    return (
        <>
            {/* Visible Teaser - glass-panel */}
            <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-t-2xl border-b border-white/5 group relative">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-xs font-mono text-accent uppercase tracking-wider mb-2 block">
                            Project Title
                        </span>
                        <h2 className="text-xl font-bold leading-tight">{displayTitle}</h2>
                    </div>
                    {displayChapters.length > 0 && (
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/10"
                            title="Download Outline"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="mt-6">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2 block">
                        Abstract Preview
                    </span>
                    <div className="text-gray-300 leading-relaxed text-sm prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{abstractPreview}</ReactMarkdown>
                    </div>
                </div>
            </div>

            {/* Content Panel - glass-panel */}
            <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-b-2xl border-t-0 relative overflow-hidden min-h-[280px]">
                <div className="space-y-6">
                    {displayChapters.length > 0 ? (
                        displayChapters.map((chapter, i) => (
                            <div
                                key={i}
                                className={`animate-wipe-reveal animate-wipe-delay-${i + 1}`}
                            >
                                <h3 className="font-bold text-lg mb-2">
                                    Chapter {i + 1}: {chapter?.title || 'Loading...'}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    {chapter?.content || 'Generating content...'}
                                </p>
                            </div>
                        ))
                    ) : isStreaming ? (
                        // Skeleton while waiting for first chapter
                        [...Array(3)].map((_, i) => (
                            <SkeletonChapter key={i} />
                        ))
                    ) : (
                        <div className="text-gray-500 text-center py-10">
                            Waiting for content...
                        </div>
                    )}
                </div>
            </div>

            <DownloadOptionsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={async (format, options) => {
                    const fullContent = displayChapters
                        .map((c, i) => c ? `# Chapter ${i + 1}: ${c.title || 'Untitled'}\n\n${c.content || ''}` : '')
                        .join('\n\n');
                    const title = `Outline - ${displayTitle}`;
                    const filename = sanitizeFilename(title);

                    if (format === 'markdown') {
                        const blob = generateMarkdownBlob(fullContent, title);
                        downloadFile(blob, `${filename}.md`);
                    } else {
                        const blob = await generateDocxBlob(fullContent, title, options);
                        downloadFile(blob, `${filename}.docx`);
                    }
                }}
                title="Download Outline"
            />
        </>
    );
}
