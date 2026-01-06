'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookOpen, Loader2, Download, ChevronDown, ChevronRight, Sparkles, CheckCircle2, FileText, FileType } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateMarkdownBlob, generateDocxBlob, downloadFile, sanitizeFilename } from '@/lib/export-service';

interface ChapterGeneratorProps {
    projectId: string;
}

interface GeneratedChapter {
    number: number;
    title: string;
    content: string;
    isGenerating: boolean;
}

import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { ExportOptions } from '@/lib/export-service';

const CHAPTER_INFO = [
    { number: 1, title: 'Introduction', description: 'Background, problem statement, objectives, scope' },
    { number: 2, title: 'Literature Review', description: 'Related works, theoretical framework, critiques' },
    { number: 3, title: 'Methodology', description: 'System design, DFDs, architecture, tools' },
    { number: 4, title: 'Implementation & Results', description: 'Development, testing, evaluation' },
    { number: 5, title: 'Conclusion', description: 'Summary, recommendations, future work' },
];

export function ChapterGenerator({ projectId }: ChapterGeneratorProps) {
    const [chapters, setChapters] = useState<Record<number, GeneratedChapter>>({});
    const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Download options state
    const [downloadModal, setDownloadModal] = useState<{
        isOpen: boolean;
        target: 'single' | 'all';
        chapter?: GeneratedChapter;
    }>({ isOpen: false, target: 'all' });

    // Fetch stored chapters on component mount
    useEffect(() => {
        const fetchStoredChapters = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${projectId}/chapters`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.chapters && Array.isArray(result.chapters)) {
                        // Convert stored chapters array to our Record format
                        const storedChapters: Record<number, GeneratedChapter> = {};
                        result.chapters.forEach((chapter: { number: number; title?: string; content: string }) => {
                            if (chapter.number >= 1 && chapter.number <= 5) {
                                storedChapters[chapter.number] = {
                                    number: chapter.number,
                                    title: chapter.title || CHAPTER_INFO[chapter.number - 1].title,
                                    content: chapter.content,
                                    isGenerating: false
                                };
                            }
                        });
                        setChapters(storedChapters);
                    }
                }
            } catch (error) {
                console.error('[ChapterGenerator] Failed to fetch stored chapters:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStoredChapters();
    }, [projectId]);

    const generateChapter = useCallback(async (chapterNumber: number) => {
        setError(null);

        // Mark as generating
        setChapters(prev => ({
            ...prev,
            [chapterNumber]: {
                number: chapterNumber,
                title: CHAPTER_INFO[chapterNumber - 1].title,
                content: '',
                isGenerating: true
            }
        }));

        // Auto-expand
        setExpandedChapter(chapterNumber);

        try {
            const response = await fetch('/api/generate/chapter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, chapterNumber })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate chapter');
            }

            // Stream the response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let content = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    content += chunk;

                    // Update state with streamed content
                    setChapters(prev => ({
                        ...prev,
                        [chapterNumber]: {
                            ...prev[chapterNumber],
                            content,
                            isGenerating: true
                        }
                    }));
                }
            }

            // Mark as complete
            setChapters(prev => ({
                ...prev,
                [chapterNumber]: {
                    ...prev[chapterNumber],
                    content,
                    isGenerating: false
                }
            }));

        } catch (err) {
            console.error('[ChapterGenerator] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate chapter');

            // Clear generating state
            setChapters(prev => ({
                ...prev,
                [chapterNumber]: {
                    ...prev[chapterNumber],
                    isGenerating: false
                }
            }));
        }
    }, [projectId]);

    const handleDownloadConfirm = useCallback(async (format: 'markdown' | 'docx', options: ExportOptions) => {
        const { target, chapter } = downloadModal;

        try {
            if (target === 'single' && chapter) {
                const filename = sanitizeFilename(`Chapter_${chapter.number}_${chapter.title}`);
                if (format === 'markdown') {
                    const blob = generateMarkdownBlob(chapter.content, chapter.title);
                    downloadFile(blob, `${filename}.md`);
                } else {
                    const blob = await generateDocxBlob(chapter.content, chapter.title, options);
                    downloadFile(blob, `${filename}.docx`);
                }
            } else if (target === 'all') {
                const generatedChapters = Object.values(chapters).filter(c => c.content && !c.isGenerating);
                if (generatedChapters.length === 0) return;

                const sortedChapters = generatedChapters.sort((a, b) => a.number - b.number);
                const fullContent = sortedChapters
                    .map(c => `# Chapter ${c.number}: ${c.title}\n\n${c.content}`)
                    .join('\n\n---\n\n');

                const filename = 'Full_Project_Documentation';
                if (format === 'markdown') {
                    const blob = generateMarkdownBlob(fullContent, 'Full Project Documentation');
                    downloadFile(blob, `${filename}.md`);
                } else {
                    const blob = await generateDocxBlob(fullContent, 'Full Project Documentation', options);
                    downloadFile(blob, `${filename}.docx`);
                }
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    }, [downloadModal, chapters]);

    const completedCount = Object.values(chapters).filter(c => c.content && !c.isGenerating).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Chapter Generator
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Generate full academic content for each chapter
                    </p>
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
                    const isGenerating = chapter?.isGenerating;
                    const isGenerated = chapter?.content && !isGenerating;
                    const isExpanded = expandedChapter === info.number;

                    return (
                        <div
                            key={info.number}
                            className="glass-panel rounded-2xl overflow-hidden"
                        >
                            {/* Chapter Header */}
                            <div className="p-3 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                                <button
                                    onClick={() => setExpandedChapter(isExpanded ? null : info.number)}
                                    className="flex items-center gap-3 md:gap-4 w-full md:flex-1 text-left"
                                    disabled={!isGenerated}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isGenerated ? 'bg-green-500/20 text-green-400' :
                                        isGenerating ? 'bg-primary/20 text-primary' :
                                            'bg-white/5 text-gray-500'
                                        }`}>
                                        {isGenerating ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isGenerated ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            info.number
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-white">
                                            Chapter {info.number}: {info.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">{info.description}</p>
                                    </div>

                                    {isGenerated && (
                                        isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-gray-500 ml-auto" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
                                        )
                                    )}
                                </button>

                                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto md:ml-4 border-t border-white/5 pt-2.5 md:pt-0 md:border-t-0">
                                    {isGenerated && (
                                        <button
                                            onClick={() => setDownloadModal({ isOpen: true, target: 'single', chapter })}
                                            className="p-2 text-gray-400 hover:text-accent transition-colors"
                                            title="Download options"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    )}

                                    {!isGenerating && (
                                        <button
                                            onClick={() => generateChapter(info.number)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${isGenerated
                                                ? 'border border-white/10 text-gray-400 hover:border-white/20'
                                                : 'bg-primary text-white hover:bg-primary/90'
                                                }`}
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            {isGenerated ? 'Regenerate' : 'Generate'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {(isExpanded || isGenerating) && chapter?.content && (
                                <div className="px-5 pb-5 border-t border-white/5">
                                    <div className="mt-4 prose prose-invert prose-sm max-w-none max-h-[500px] overflow-y-auto">
                                        <ReactMarkdown>{chapter.content}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
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
