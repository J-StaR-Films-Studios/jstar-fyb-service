'use client';

import { SkeletonChapter } from '@/components/ui/Skeleton';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { generateMarkdownBlob, generateDocxBlob, downloadFile, sanitizeFilename } from '@/lib/export-service';
import { Download, ChevronDown, ChevronUp, FileText } from 'lucide-react';
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

const ABSTRACT_TRUNCATE_LENGTH = 180;

/**
 * Displays the project outline preview with glass morphism styling.
 * Features: title, abstract, chapter pills, download button, collapsible behavior.
 * Handles streaming skeleton states during generation.
 */
export function OutlinePreview({
    displayTitle,
    abstractPreview,
    displayChapters,
    isStreaming
}: OutlinePreviewProps) {
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showFullAbstract, setShowFullAbstract] = useState(false);

    // Truncate abstract for preview
    const truncatedAbstract = abstractPreview.length > ABSTRACT_TRUNCATE_LENGTH
        ? abstractPreview.slice(0, ABSTRACT_TRUNCATE_LENGTH) + '...'
        : abstractPreview;

    const needsTruncation = abstractPreview.length > ABSTRACT_TRUNCATE_LENGTH;

    // Generate chapter labels for pills
    const chapterLabels = displayChapters
        .filter((ch): ch is Chapter => !!ch)
        .map((ch, i) => `Ch ${i + 1}: ${ch.title || 'Untitled'}`);

    return (
        <>
            {/* Glass Morphism Card */}
            <div
                className={`
                    relative overflow-hidden transition-all duration-300
                    bg-white/[0.03] backdrop-blur-xl 
                    border border-white/10 rounded-2xl
                    hover:border-white/20
                    shadow-[0_4px_30px_rgba(0,0,0,0.2)]
                `}
            >
                {/* Header Section - Always Visible */}
                <div className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2 block">
                                Project Title
                            </span>
                            <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight truncate">
                                {displayTitle || 'Untitled Project'}
                            </h2>
                        </div>

                        {/* Download Button */}
                        {displayChapters.length > 0 && (
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="p-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 ml-4"
                                title="Download Outline"
                            >
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Abstract Preview - Truncated */}
                    <div className="mb-6">
                        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                            {showFullAbstract || !needsTruncation ? abstractPreview : truncatedAbstract}
                            {needsTruncation && !showFullAbstract && (
                                <button
                                    onClick={() => setShowFullAbstract(true)}
                                    className="text-primary hover:text-primary/80 cursor-pointer text-xs ml-1 font-bold transition-colors"
                                >
                                    Read Abstract
                                </button>
                            )}
                        </p>
                    </div>

                    {/* Chapter Pills - Horizontal Scroll */}
                    {chapterLabels.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                            {chapterLabels.map((label, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-medium whitespace-nowrap flex-shrink-0"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expand/Collapse Toggle */}
                <div className="px-6 pb-3 flex items-center justify-between border-t border-white/5 pt-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4" />
                                <span>Collapse Preview</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                <span>Expand Full Preview</span>
                            </>
                        )}
                    </button>

                    {/* Chapter count indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{displayChapters.filter(c => c && c.title).length} chapters</span>
                    </div>
                </div>

                {/* Expandable Content Section */}
                <div
                    className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="px-6 pb-6 border-t border-white/5 pt-4 mt-0">
                        {isStreaming && displayChapters.length === 0 ? (
                            // Skeleton while streaming
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                                </div>
                                {[...Array(3)].map((_, i) => (
                                    <SkeletonChapter key={i} />
                                ))}
                            </div>
                        ) : displayChapters.length > 0 ? (
                            // Chapter List
                            <div className="space-y-4">
                                {displayChapters.map((chapter, i) => (
                                    <div
                                        key={i}
                                        className="animate-wipe-reveal"
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    >
                                        <h3 className="font-bold text-lg mb-2 text-gray-100">
                                            Chapter {i + 1}: {chapter?.title || 'Loading...'}
                                        </h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            {chapter?.content || 'Generating content...'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-10">
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="w-8 h-8 text-gray-600" />
                                    <p>Waiting for content...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Download Modal */}
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
