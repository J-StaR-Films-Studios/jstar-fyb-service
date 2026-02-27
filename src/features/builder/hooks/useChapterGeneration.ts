import { useState, useCallback, useEffect } from 'react';
import { generateMarkdownBlob, generateDocxBlob, downloadFile, sanitizeFilename, ExportOptions } from '@/lib/export-service';
import { ChapterStatus } from '../components/ChapterCard';

export interface GeneratedChapter {
    number: number;
    title: string;
    content: string;
    isGenerating: boolean;
    progress?: number;
}

export const CHAPTER_INFO = [
    { number: 1, title: 'Introduction', description: 'Background, problem statement, objectives, scope', estimatedWords: 2500 },
    { number: 2, title: 'Literature Review', description: 'Related works, theoretical framework, critiques', estimatedWords: 2800 },
    { number: 3, title: 'Methodology', description: 'System design, DFDs, architecture, tools', estimatedWords: 2800 },
    { number: 4, title: 'Implementation & Results', description: 'Development, testing, evaluation', estimatedWords: 3000 },
    { number: 5, title: 'Conclusion', description: 'Summary, recommendations, future work', estimatedWords: 2000 },
];

export function useChapterGeneration(projectId: string) {
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
                isGenerating: true,
                progress: 0
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

                    // Update state with streamed content and simulated progress
                    setChapters(prev => ({
                        ...prev,
                        [chapterNumber]: {
                            ...prev[chapterNumber],
                            content,
                            isGenerating: true,
                            progress: Math.min(90, (prev[chapterNumber]?.progress || 0) + 5)
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
                    isGenerating: false,
                    progress: 100
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
                    isGenerating: false,
                    progress: 0
                }
            }));
        }
    }, [projectId]);

    const handleDownloadConfirm = useCallback(async (format: 'markdown' | 'docx', options: ExportOptions) => {
        const { target, chapter } = downloadModal;

        // Refresh chapters from DB to ensure we have the latest content (fixes sync issues with Workspace)
        let currentChapters = chapters;
        try {
            if (target === 'all') {
                const response = await fetch(`/api/projects/${projectId}/chapters`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.chapters && Array.isArray(result.chapters)) {
                        const storedChapters: Record<number, GeneratedChapter> = {};
                        result.chapters.forEach((c: { number: number; title?: string; content: string }) => {
                            if (c.number >= 1 && c.number <= 5) {
                                storedChapters[c.number] = {
                                    number: c.number,
                                    title: c.title || CHAPTER_INFO[c.number - 1].title,
                                    content: c.content,
                                    isGenerating: false
                                };
                            }
                        });
                        setChapters(storedChapters); // Update UI
                        currentChapters = storedChapters; // Use for export
                    }
                }
            }
        } catch (err) {
            console.error('Failed to sync chapters before export', err);
        }

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
                // Use currentChapters to ensure we export the latest data
                const generatedChapters = Object.values(currentChapters).filter(c => c.content && !c.isGenerating);
                if (generatedChapters.length === 0) return;

                const sortedChapters = generatedChapters.sort((a, b) => a.number - b.number);
                const fullContent = sortedChapters
                    .map(c => `# Chapter ${c.number}: ${c.title}\n\n${c.content}`)
                    .join('\n\n');

                const filename = sanitizeFilename('Full_Project_Documentation');
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
    }, [downloadModal, chapters, projectId]);

    const completedCount = Object.values(chapters).filter(c => c.content && !c.isGenerating).length;
    const generatingCount = Object.values(chapters).filter(c => c.isGenerating).length;
    const readyCount = completedCount;

    // Determine chapter status
    const getChapterStatus = (chapterNumber: number): ChapterStatus => {
        const chapter = chapters[chapterNumber];
        if (chapter?.isGenerating) return 'generating';
        if (chapter?.content) return 'complete';
        return 'queued';
    };

    // Get word count from content
    const getWordCount = (content: string): number => {
        return content ? content.split(/\s+/).filter(Boolean).length : 0;
    };

    return {
        chapters,
        expandedChapter,
        setExpandedChapter,
        error,
        isLoading,
        downloadModal,
        setDownloadModal,
        generateChapter,
        handleDownloadConfirm,
        completedCount,
        generatingCount,
        readyCount,
        getChapterStatus,
        getWordCount
    };
}
