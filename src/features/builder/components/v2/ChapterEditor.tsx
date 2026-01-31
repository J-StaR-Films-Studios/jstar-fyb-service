'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimelineSidebar } from './TimelineSidebar';
import { WritingCanvas } from './WritingCanvas';
import { MobileTimelineView } from './MobileTimelineView';
import { SectionEditor } from './SectionEditor';
import { MobileFloatingNav } from './MobileFloatingNav';
import { useMediaQuery } from '../../../../hooks/use-media-query';
import { Search, ChevronLeft, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DocumentUpload } from '../DocumentUpload';
import { ResearchStatus } from '../ResearchStatus';
import { AcademicCopilot } from './AcademicCopilot';
import { DiagramGenerator } from './DiagramGenerator';
import { DiagramsList } from './DiagramsList';
import { SaveStatusBadge } from './SaveStatusBadge';
import { VersionHistoryDropdown } from './VersionHistoryDropdown';
import { EnhanceOptionsPopover } from './EnhanceOptionsPopover';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { generateMarkdownBlob, downloadFile, sanitizeFilename, ExportOptions } from '@/lib/export-service';
import { type Editor as TipTapEditor } from '@tiptap/core';
import { toast } from 'sonner';

interface Chapter {
    id: string;
    number: number;
    title: string;
    content: string;
    status: 'locked' | 'draft' | 'in-progress' | 'complete';
    wordCount: number;
    subsections: string[]; // derived from content
    version: number;
}

interface ChapterEditorProps {
    projectId: string;
    initialData?: {
        project: any;
        chapters: any;
    };
}

// Helper defined outside component to prevent recreation
const parseSubsections = (content: string) => {
    if (!content) return [];
    return content.match(/^##\s+(.+)$/gm)?.map(s => s.replace(/^##\s+/, '')) || [];
};

const CHAPTER_TITLES = ["Introduction", "Literature Review", "Methodology", "Implementation", "Conclusion"];
export function ChapterEditor({ projectId }: ChapterEditorProps) {
    // State
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [activeChapterNumber, setActiveChapterNumber] = useState(1);
    const [projectTitle, setProjectTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Save Status State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const pendingContentRef = useRef<string | null>(null);

    // Right Panel State
    const [activeTab, setActiveTab] = useState<'research' | 'chat' | 'diagrams'>('research');
    const [searchQuery, setSearchQuery] = useState('');

    // Mobile State
    const [mobileView, setMobileView] = useState<'timeline' | 'editor' | 'context'>('timeline');
    const [activeSection, setActiveSection] = useState<{ title: string; content: string } | null>(null);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // Telegram State
    const [isCreatingDiagram, setIsCreatingDiagram] = useState(false);

    // Enhance State
    const [showEnhancePopover, setShowEnhancePopover] = useState(false);
    const [contentToEnhance, setContentToEnhance] = useState('');

    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Editor Ref for Inline Insertion
    const editorRef = useRef<TipTapEditor | null>(null);

    const handleEditorReady = useCallback((editor: TipTapEditor) => {
        editorRef.current = editor;
    }, []);

    const handleEnhanceClick = useCallback((text: string) => {
        setContentToEnhance(text);
        setShowEnhancePopover(true);
    }, []);

    const handleServerSideExport = async (format: 'markdown' | 'docx', options: ExportOptions) => {
        if (format === 'markdown') {
            // Fallback to client-side for MD as it's simple
            const fullContent = chapters
                .sort((a, b) => a.number - b.number)
                .map(c => `# Chapter ${c.number}: ${c.title}\n\n${c.content}`)
                .join('\n\n');
            const title = projectTitle || 'Project Export';
            const blob = generateMarkdownBlob(fullContent, title);
            downloadFile(blob, `${sanitizeFilename(title)}.md`);
            return;
        }

        setIsExporting(true);
        try {
            // 1. Fetch Diagram Metadata First to know what code to look for
            const diagramsRes = await fetch(`/api/projects/${projectId}/diagrams`);
            const savedDiagrams = await diagramsRes.json();

            const imageMap: Record<string, string> = {};

            // 2. Render Diagrams
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({ startOnLoad: false, theme: 'default' });

            for (const diag of savedDiagrams) {
                try {
                    const id = `export-hidden-${Math.random().toString(36).slice(2)}`;
                    const { svg } = await mermaid.render(id, diag.mermaidCode);

                    // Convert to PNG Base64
                    const img = new Image();
                    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);

                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = url;
                    });

                    const canvas = document.createElement('canvas');
                    const scale = 2; // 2x scale
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0);
                        const pngData = canvas.toDataURL('image/png');
                        imageMap[diag.mermaidCode] = pngData;
                    }
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error('Failed to render diagram for export', e);
                }
            }

            // 3. Call Server API
            const response = await fetch(`/api/projects/${projectId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    diagrams: imageMap,
                    options: options
                }),
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sanitizeFilename(projectTitle || 'Project')}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Export error', error);
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    // Auto-clear saved status after 2s
    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    // Fetch Logic
    const fetchData = useCallback(async (isPolling = false) => {
        try {
            if (!isPolling) setIsLoading(true);
            const response = await fetch(`/api/projects/${projectId}/chapters`);
            const data = await response.json();

            if (data.success && data.chapters) {
                let mappedChapters: Chapter[] = [];

                if (Array.isArray(data.chapters) && data.chapters.length > 0) {
                    const existingChapters = new Map(
                        data.chapters.map((c: any) => [c.number, {
                            id: c.id,
                            number: c.number,
                            title: c.title,
                            content: c.content,
                            status: c.status?.toLowerCase() || 'draft',
                            wordCount: c.wordCount || 0,
                            subsections: parseSubsections(c.content),
                            version: c.version || 1
                        }])
                    );

                    mappedChapters = Array.from({ length: 5 }, (_, i) => {
                        const num = i + 1;
                        const existing = existingChapters.get(num);
                        if (existing) {
                            return existing as Chapter;
                        }
                        return {
                            id: `chapter-${num}`,
                            number: num,
                            title: CHAPTER_TITLES[i],
                            content: '',
                            status: 'draft' as const,
                            wordCount: 0,
                            subsections: [],
                            version: 1
                        };
                    });
                } else {
                    mappedChapters = Array.from({ length: 5 }, (_, i) => {
                        const num = i + 1;
                        const content = data.chapters?.[`chapter_${num}`] || '';
                        return {
                            id: `chapter-${num}`,
                            number: num,
                            title: CHAPTER_TITLES[i],
                            content: content,
                            status: 'draft' as const,
                            wordCount: content ? content.split(/\s+/).length : 0,
                            subsections: parseSubsections(content),
                            version: 1
                        };
                    });
                }

                if (data.topic) setProjectTitle(data.topic);

                // Only update state if different to prevent re-renders/cursor jumps? 
                // React handles this usually, but strictly speaking deep comparison would be better.
                // For now, straight set is safely handled by React batching.
                setChapters(mappedChapters);
            } else {
                // ... (Empty logic same as before)
                const emptyChapters: Chapter[] = Array.from({ length: 5 }, (_, i) => ({
                    id: `chapter-${i + 1}`,
                    number: i + 1,
                    title: CHAPTER_TITLES[i],
                    content: '',
                    status: 'draft' as const,
                    wordCount: 0,
                    subsections: [],
                    version: 1
                }));
                setChapters(emptyChapters);
            }
        } catch (error) {
            console.error('Failed to load chapters', error);
        } finally {
            if (!isPolling) setIsLoading(false);
        }
    }, [projectId]);

    // Initial Load
    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    // Polling Interval (every 30 seconds)
    useEffect(() => {
        // Only poll if tab is visible to save resources
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchData(true);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Helpers
    const saveChapterContent = useCallback(async (chapterNumber: number, content: string) => {
        pendingContentRef.current = content;

        setChapters(prev => prev.map(c =>
            c.number === chapterNumber
                ? { ...c, content, wordCount: content.split(/\s+/).length, subsections: parseSubsections(content) }
                : c
        ));

        setSaveStatus('saving');

        try {
            const response = await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                setSaveStatus('saved');
                setLastSavedAt(new Date());
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Failed to save chapter', error);
            setSaveStatus('error');
        }
    }, [projectId]);

    const handleSave = useCallback(async (content: string) => {
        return saveChapterContent(activeChapterNumber, content);
    }, [activeChapterNumber, saveChapterContent]);



    const handleApplyAiEdit = useCallback((chapterNumber: number, original: string, replacement: string) => {
        const chapter = chapters.find(c => c.number === chapterNumber);

        if (!chapter) return;

        if (chapter.content.includes(original)) {
            const newContent = chapter.content.replace(original, replacement);
            saveChapterContent(chapterNumber, newContent);
        } else {
            const trimmedOriginal = original.trim();
            if (chapter.content.includes(trimmedOriginal)) {
                const newContent = chapter.content.replace(trimmedOriginal, replacement);
                saveChapterContent(chapterNumber, newContent);
            } else {
                toast.error('Could not find original content to replace');
            }
        }
    }, [chapters, saveChapterContent]);

    const triggerManualSave = useCallback(() => {
        const chapter = chapters.find(c => c.number === activeChapterNumber);
        if (chapter) {
            handleSave(chapter.content);
        }
    }, [chapters, activeChapterNumber, handleSave]);

    const handleInsertDiagram = useCallback((diagram: { mermaidCode: string; title: string }) => {
        if (editorRef.current) {
            editorRef.current.chain().focus().insertContent({
                type: 'mermaidDiagram',
                attrs: {
                    code: diagram.mermaidCode,
                    title: diagram.title || 'Diagram'
                }
            }).run();

            if (mobileView === 'context') {
                setMobileView('editor');
            }
            toast.success(`Inserted "${diagram.title}"`);
        } else {
            toast.error('Editor not active. Please open a chapter first.');
        }
    }, [mobileView]);



    const handleGenerateChapter = useCallback(async (chapterNumber: number) => {
        try {
            setChapters(prev => prev.map(c =>
                c.number === chapterNumber ? { ...c, status: 'in-progress' } : c
            ));

            const response = await fetch('/api/generate/chapter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, chapterNumber })
            });

            if (!response.ok) throw new Error('Failed to generate');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let content = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    content += decoder.decode(value, { stream: true });

                    setChapters(prev => prev.map(c =>
                        c.number === chapterNumber ? {
                            ...c,
                            content,
                            wordCount: content.split(/\s+/).length,
                            subsections: parseSubsections(content)
                        } : c
                    ));
                }
            }

            // After stream finishes, save the final content to ensure DB consistency
            await saveChapterContent(chapterNumber, content);

            setChapters(prev => prev.map(c =>
                c.number === chapterNumber ? { ...c, status: 'complete' } : c
            ));

        } catch (error) {
            console.error('Generation failed', error);
        }
    }, [projectId, saveChapterContent]);

    const activeChapter = chapters.find(c => c.number === activeChapterNumber);

    const handleMobileTabChange = (tab: 'write' | 'research' | 'chat' | 'diagrams' | 'settings') => {
        if (tab === 'write') {
            setMobileView(activeChapter ? 'editor' : 'timeline');
        } else if (tab === 'research' || tab === 'chat' || tab === 'diagrams') {
            setActiveTab(tab === 'research' ? 'research' : tab === 'chat' ? 'chat' : 'diagrams');
            setMobileView('context');
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center text-primary animate-pulse">Loading Workspace...</div>;

    // Desktop Layout
    if (isDesktop) {
        return (
            <div className="flex h-screen w-full bg-dark text-gray-300 overflow-hidden font-sans">
                {/* Left Sidebar */}
                <div className="hidden md:flex shrink-0 h-full">
                    <TimelineSidebar
                        projectTitle={projectTitle || "Project Workspace"}
                        chapters={chapters}
                        activeChapterNumber={activeChapterNumber}
                        onChapterSelect={setActiveChapterNumber}
                        onGenerateChapter={handleGenerateChapter}
                    />
                </div>

                {/* Main Content */}
                <main className="flex-1 flex flex-col relative h-full w-full">
                    <WritingCanvas
                        projectId={projectId}
                        title={activeChapter?.title?.toLowerCase().startsWith('chapter')
                            ? activeChapter.title
                            : `Chapter ${activeChapterNumber} / ${activeChapter?.title || 'Untitled'}`}
                        content={activeChapter?.content}
                        onValidChange={handleSave}
                        onEditorReady={handleEditorReady}
                        onEnhanceClick={handleEnhanceClick}
                        headerRight={
                            <div className="flex items-center gap-2">
                                {activeChapter && (
                                    <VersionHistoryDropdown
                                        projectId={projectId}
                                        chapterNumber={activeChapterNumber}
                                        currentVersion={activeChapter.version}
                                        currentContent={activeChapter.content}
                                        onRestore={(content) => {
                                            handleSave(content);
                                        }}
                                    />
                                )}
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                                <SaveStatusBadge
                                    saveStatus={saveStatus}
                                    lastSavedAt={lastSavedAt}
                                    onSave={triggerManualSave}
                                />
                            </div>
                        }
                    />
                </main>

                {/* Right Context Sidebar */}
                <aside className="hidden lg:flex w-96 flex-col glass-panel border-l border-white/5 bg-dark/95 backdrop-blur-xl z-20">
                    <div className="flex border-b border-white/5 shrink-0">
                        <button
                            onClick={() => setActiveTab('research')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold border-b-2 transition-colors",
                                activeTab === 'research' ? "border-primary text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                            )}
                        >
                            Research
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold border-b-2 transition-colors",
                                activeTab === 'chat' ? "border-primary text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                            )}
                        >
                            AI Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('diagrams')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold border-b-2 transition-colors",
                                activeTab === 'diagrams' ? "border-primary text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                            )}
                        >
                            Diagrams
                        </button>
                    </div>

                    {activeTab === 'research' && (
                        <div className="p-4 border-b border-white/5 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search references..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-primary/50 text-gray-300 placeholder-gray-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'research' ? (
                            <div className="p-4 space-y-4">
                                <ResearchStatus projectId={projectId} />
                                <DocumentUpload projectId={projectId} searchQuery={searchQuery} />
                            </div>
                        ) : activeTab === 'chat' ? (
                            <AcademicCopilot
                                projectId={projectId}
                                activeChapterId={activeChapter?.id}
                                activeChapterNumber={activeChapter?.number}
                                onApplyEdit={handleApplyAiEdit}
                                onInsertDiagram={handleInsertDiagram}
                                onToolCompleted={() => fetchData(true)}
                            />
                        ) : (
                            <div className="p-4 h-full flex flex-col">
                                {isCreatingDiagram ? (
                                    <DiagramGenerator
                                        projectId={projectId}
                                        onSave={() => setIsCreatingDiagram(false)}
                                        onCancel={() => setIsCreatingDiagram(false)}
                                        onInsert={handleInsertDiagram}
                                    />
                                ) : (
                                    <DiagramsList
                                        projectId={projectId}
                                        onCreateNew={() => setIsCreatingDiagram(true)}
                                        onInsert={handleInsertDiagram}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {showEnhancePopover && activeChapter && (
                    <EnhanceOptionsPopover
                        projectId={projectId}
                        chapterNumber={activeChapterNumber}
                        selectedContent={contentToEnhance}
                        chapterContext={activeChapter.content}
                        onApply={(enhancedContent) => {
                            const newContent = activeChapter.content === contentToEnhance
                                ? enhancedContent
                                : activeChapter.content.replace(contentToEnhance, enhancedContent);
                            handleSave(newContent);
                        }}
                        onClose={() => setShowEnhancePopover(false)}
                    />
                )}
                <DownloadOptionsModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    onConfirm={handleServerSideExport}
                    title="Export Project"
                />
            </div>
        );
    }

    // Mobile Layout
    return (
        <div className="flex flex-col min-h-screen bg-dark text-white font-sans">
            <header className="fixed top-0 w-full z-40 px-6 pt-6 pb-4 flex justify-between items-start bg-gradient-to-b from-dark via-dark/80 to-transparent pointer-events-none">
                <div className="flex flex-col pointer-events-auto mt-2">
                    <Link href="/dashboard" className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest mb-1 hover:underline">
                        <ChevronLeft className="w-3 h-3" /> Back to Dashboard
                    </Link>
                    <h1 className="font-display font-bold text-2xl leading-tight text-white line-clamp-2 max-w-[200px]">{projectTitle || "Workspace"}</h1>
                </div>
                <div className="pointer-events-auto mt-2 shrink-0">
                    <SaveStatusBadge
                        saveStatus={saveStatus}
                        lastSavedAt={lastSavedAt}
                        onSave={triggerManualSave}
                    />
                </div>
            </header>

            <main className="flex-1 relative">
                <MobileTimelineView
                    chapters={chapters}
                    onChapterClick={(id) => {
                        const clickedChapter = chapters.find(c => c.id === id);
                        if (clickedChapter) {
                            setActiveChapterNumber(clickedChapter.number);
                            setMobileView('editor');
                        }
                    }}
                />
            </main>

            {mobileView !== 'editor' && (
                <div className="relative z-[60]">
                    <MobileFloatingNav
                        activeTab={mobileView === 'context' ? (activeTab === 'research' ? 'research' : activeTab === 'chat' ? 'chat' : 'diagrams') : 'write'}
                        onTabChange={handleMobileTabChange}
                    />
                </div>
            )}

            {mobileView === 'editor' && activeChapter && (
                <SectionEditor
                    title={`Chapter ${activeChapter.number}`}
                    content={activeChapter.content}
                    wordCount={activeChapter.wordCount}
                    onClose={() => setMobileView('timeline')}
                    onSave={handleSave}
                    onOpenChat={() => {
                        handleMobileTabChange('chat');
                    }}
                    onEnhanceClick={handleEnhanceClick}
                    projectId={projectId}
                    chapterNumber={activeChapter.number}
                    currentVersion={activeChapter.version || 1}
                    onExport={() => setShowExportModal(true)}
                />
            )}

            {mobileView === 'context' && (
                <div className="fixed inset-0 z-50 bg-dark flex flex-col pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'research' ? (
                            <div className="p-6 space-y-6">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search references..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/50 text-gray-300 placeholder-gray-600"
                                    />
                                </div>
                                <ResearchStatus projectId={projectId} />
                                <DocumentUpload projectId={projectId} searchQuery={searchQuery} />
                            </div>
                        ) : activeTab === 'chat' ? (
                            <AcademicCopilot
                                projectId={projectId}
                                activeChapterId={activeChapter?.id}
                                activeChapterNumber={activeChapter?.number}
                                onClose={() => setMobileView('timeline')}
                                onApplyEdit={handleApplyAiEdit}
                                onToolCompleted={() => fetchData(true)}
                            />
                        ) : (
                            <div className="p-6">
                                {isCreatingDiagram ? (
                                    <DiagramGenerator
                                        projectId={projectId}
                                        onSave={() => setIsCreatingDiagram(false)}
                                        onCancel={() => setIsCreatingDiagram(false)}
                                        onInsert={handleInsertDiagram}
                                    />
                                ) : (
                                    <DiagramsList
                                        projectId={projectId}
                                        onCreateNew={() => setIsCreatingDiagram(true)}
                                        onInsert={handleInsertDiagram}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showEnhancePopover && activeChapter && (
                <EnhanceOptionsPopover
                    projectId={projectId}
                    chapterNumber={activeChapterNumber}
                    selectedContent={contentToEnhance}
                    chapterContext={activeChapter.content}
                    onApply={(enhancedContent) => {
                        const newContent = activeChapter.content === contentToEnhance
                            ? enhancedContent
                            : activeChapter.content.replace(contentToEnhance, enhancedContent);
                        handleSave(newContent);
                    }}
                    onClose={() => setShowEnhancePopover(false)}
                />
            )}

            <DownloadOptionsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={handleServerSideExport}
                title="Export Project"
            />
        </div>
    );
}
