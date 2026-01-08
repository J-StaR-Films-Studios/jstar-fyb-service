'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimelineSidebar } from './TimelineSidebar';
import { WritingCanvas } from './WritingCanvas';
import { MobileTimelineView } from './MobileTimelineView';
import { SectionEditor } from './SectionEditor';
import { MobileFloatingNav } from './MobileFloatingNav';
import { useMediaQuery } from '../../../../hooks/use-media-query';
import { Search, BrainCircuit, ArrowRight, FileText, Globe, Cloud, Loader2, Check, CloudOff, MessageSquare, Layout, ChevronLeft, BookOpen, Save, Undo, Redo, Sparkles, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DocumentUpload } from '../DocumentUpload';
import { ResearchStatus } from '../ResearchStatus';
import { AcademicCopilot } from './AcademicCopilot';
import { VersionHistoryDropdown } from './VersionHistoryDropdown';
import { EnhanceOptionsPopover } from './EnhanceOptionsPopover';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { generateMarkdownBlob, generateDocxBlob, downloadFile, sanitizeFilename, ExportOptions } from '@/lib/export-service';

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

    // Enhance State
    const [showEnhancePopover, setShowEnhancePopover] = useState(false);
    const [contentToEnhance, setContentToEnhance] = useState('');

    // Export State
    const [showExportModal, setShowExportModal] = useState(false);

    // Auto-clear saved status after 2s
    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Project Info for Title
                // In a real app we might bundle this, but for now separate calls or passed via props
                // Assuming we can get title from chapters endpoint or separate project endpoint
                // For now, let's fetch chapters

                const response = await fetch(`/api/projects/${projectId}/chapters`);
                const data = await response.json();

                if (data.success && data.chapters) {
                    // Start: Transform API data to Component State
                    // This logic mirrors ChapterGenerator but for V2
                    // We need to map the Record<string, string> or Chapter[] to our state

                    // Note: API returns `project.chapters` (Array) if available, or legacy object
                    // Let's handle Array format primarily as we migrated

                    const CHAPTER_TITLES = ["Introduction", "Literature Review", "Methodology", "Implementation", "Conclusion"];
                    let mappedChapters: Chapter[] = [];

                    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
                        // Map existing chapters from API
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

                        // Always create all 5 chapters, using existing data or empty stubs
                        mappedChapters = Array.from({ length: 5 }, (_, i) => {
                            const num = i + 1;
                            const existing = existingChapters.get(num);
                            if (existing) {
                                return existing as Chapter;
                            }
                            // Empty chapter stub
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
                        // Legacy object support fallback OR empty API response
                        // Always create 5 chapters with 'draft' status so user can generate
                        mappedChapters = Array.from({ length: 5 }, (_, i) => {
                            const num = i + 1;
                            const content = data.chapters?.[`chapter_${num}`] || '';
                            return {
                                id: `chapter-${num}`,
                                number: num,
                                title: CHAPTER_TITLES[i],
                                content: content,
                                status: 'draft' as const, // Always draft so generate button shows
                                wordCount: content ? content.split(/\s+/).length : 0,
                                subsections: parseSubsections(content),
                                version: 1
                            };
                        });
                    }

                    if (data.topic) setProjectTitle(data.topic);
                    setChapters(mappedChapters);
                } else {
                    // API returned no chapters at all - initialize empty structure
                    const CHAPTER_TITLES = ["Introduction", "Literature Review", "Methodology", "Implementation", "Conclusion"];
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
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    // Helpers
    const parseSubsections = (content: string) => {
        if (!content) return [];
        return content.match(/^##\s+(.+)$/gm)?.map(s => s.replace(/^##\s+/, '')) || [];
    };

    const saveChapterContent = useCallback(async (chapterNumber: number, content: string) => {
        // Store pending content for manual save
        pendingContentRef.current = content;

        // Optimistic update
        setChapters(prev => prev.map(c =>
            c.number === chapterNumber
                ? { ...c, content, wordCount: content.split(/\s+/).length, subsections: parseSubsections(content) }
                : c
        ));

        // Show saving status
        setSaveStatus('saving');

        // API Call
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

    // AI Edit Application Handler
    const handleApplyAiEdit = useCallback((chapterNumber: number, original: string, replacement: string) => {
        const chapter = chapters.find(c => c.number === chapterNumber);

        if (!chapter) {
            console.error('Target chapter not found for edit application');
            return;
        }

        // Try to replace content
        // Note: This simple replacement assumes the original string is unique or the first occurrence is correct.
        // For production, we might need fuzzy matching or context-aware replacement.
        if (chapter.content.includes(original)) {
            const newContent = chapter.content.replace(original, replacement);
            saveChapterContent(chapterNumber, newContent);
        } else {
            // Fallback: Try trimming whitespace
            const trimmedOriginal = original.trim();
            if (chapter.content.includes(trimmedOriginal)) {
                 const newContent = chapter.content.replace(trimmedOriginal, replacement);
                 saveChapterContent(chapterNumber, newContent);
            } else {
                console.error('Original content not found in chapter. Edit could not be applied.');
                // In a real implementation, we would show a toast notification here
            }
        }
    }, [chapters, saveChapterContent]);

    // Manual save trigger
    const triggerManualSave = useCallback(() => {
        const chapter = chapters.find(c => c.number === activeChapterNumber);
        if (chapter) {
            handleSave(chapter.content);
        }
    }, [chapters, activeChapterNumber, handleSave]);

    // Save Status Indicator Component (inline)
    const SaveStatusBadge = ({ showText = true }: { showText?: boolean }) => {
        const config = {
            idle: { icon: <Cloud className="w-4 h-4" />, text: lastSavedAt ? 'Saved' : 'Ready', className: 'text-gray-400 bg-white/5' },
            saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', className: 'text-primary bg-primary/20' },
            saved: { icon: <Check className="w-4 h-4" />, text: 'Saved!', className: 'text-green-400 bg-green-500/20' },
            error: { icon: <CloudOff className="w-4 h-4" />, text: 'Failed', className: 'text-red-400 bg-red-500/20' },
        }[saveStatus];

        return (
            <button
                onClick={triggerManualSave}
                disabled={saveStatus === 'saving'}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 transition-all duration-300',
                    'hover:scale-105 active:scale-95 disabled:hover:scale-100',
                    config.className
                )}
                title={saveStatus === 'error' ? 'Click to retry' : 'Click to save now'}
            >
                {config.icon}
                {showText && (
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        {config.text}
                    </span>
                )}
            </button>
        );
    };

    const activeChapter = chapters.find(c => c.number === activeChapterNumber);

    const handleMobileTabChange = (tab: 'write' | 'research' | 'chat' | 'diagrams' | 'settings') => {
        if (tab === 'write') {
            setMobileView(activeChapter ? 'editor' : 'timeline');
        } else if (tab === 'research' || tab === 'chat' || tab === 'diagrams') {
            setActiveTab(tab === 'research' ? 'research' : tab === 'chat' ? 'chat' : 'diagrams');
            setMobileView('context');
        }
    };

    // Render Logic
    if (isLoading) return <div className="flex h-screen items-center justify-center text-primary animate-pulse">Loading Workspace...</div>;

    // Desktop Layout
    if (isDesktop) {
        return (
            <div className="flex h-screen w-full bg-dark text-gray-300 overflow-hidden font-sans">
                {/* Visual Shell Logic directly here since we deleted ProjectWorkspaceLayout logic essentially */}

                {/* Left Sidebar */}
                <div className="hidden md:flex shrink-0 h-full">
                    <TimelineSidebar
                        projectTitle={projectTitle || "Project Workspace"}
                        chapters={chapters}
                        activeChapterNumber={activeChapterNumber}
                        onChapterSelect={setActiveChapterNumber}
                        onGenerateChapter={async (chapterNumber) => {
                            // Logic borrowed from ChapterGenerator.tsx
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

                                        // Live update
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

                                // Final save
                                handleSave(content);

                                // Mark complete
                                setChapters(prev => prev.map(c =>
                                    c.number === chapterNumber ? { ...c, status: 'complete' } : c
                                ));

                            } catch (error) {
                                console.error('Generation failed', error);
                                // Revert status on error logic could go here
                            }
                        }}
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
                        onEnhanceClick={(text) => {
                            setContentToEnhance(text);
                            setShowEnhancePopover(true);
                        }}
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
                                <SaveStatusBadge />
                            </div>
                        }
                    />
                </main>

                {/* Right Context Sidebar (Static Placeholder for Phase 1) */}
                <aside className="hidden lg:flex w-96 flex-col glass-panel border-l border-white/5 bg-dark/95 backdrop-blur-xl z-20">
                    {/* Context Tabs */}
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

                    {/* Smart Search - Only for Research Tab */}
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

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'research' ? (
                            <div className="p-4 space-y-4">
                                {/* Research Status Widget */}
                                <ResearchStatus projectId={projectId} />

                                {/* Document Upload & List */}
                                <DocumentUpload projectId={projectId} searchQuery={searchQuery} />

                                {/* Legacy Content (kept for reference or secondary view if needed) */}
                                <div className="hidden">
                                    {/* ... previous content ... */}
                                </div>
                            </div>
                        ) : activeTab === 'chat' ? (
                            <AcademicCopilot
                                projectId={projectId}
                                activeChapterId={activeChapter?.id}
                                activeChapterNumber={activeChapter?.number}
                                onApplyEdit={handleApplyAiEdit}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <Layout className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-gray-400 font-medium">Diagrams coming soon</h3>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Enhance Popover - Desktop */}
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
                {/* Export Modal - Desktop */}
                <DownloadOptionsModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    onConfirm={async (format, options) => {
                        let exportChapters = chapters;
                        // Sync before export
                        try {
                            const response = await fetch(`/api/projects/${projectId}/chapters`);
                            const data = await response.json();
                            if (data.success && data.chapters && Array.isArray(data.chapters)) {
                                // Map and merge with current state (simplified map for export)
                                exportChapters = data.chapters.map((c: any) => ({
                                    number: c.number,
                                    title: c.title,
                                    content: c.content
                                }));
                            }
                        } catch (e) {
                            console.error("Export sync failed", e);
                        }

                        const fullContent = exportChapters
                            .sort((a, b) => a.number - b.number)
                            .map(c => `# Chapter ${c.number}: ${c.title}\n\n${c.content}`)
                            .join('\n\n');
                        const title = projectTitle || 'Project Export';
                        const filename = sanitizeFilename(title);

                        if (format === 'markdown') {
                            const blob = generateMarkdownBlob(fullContent, title);
                            downloadFile(blob, `${filename}.md`);
                        } else {
                            const blob = await generateDocxBlob(fullContent, title, options);
                            downloadFile(blob, `${filename}.docx`);
                        }
                    }}
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
                    <SaveStatusBadge />
                </div>
            </header>

            <main className="flex-1 relative">
                <MobileTimelineView
                    chapters={chapters}
                    onChapterClick={(id) => {
                        // Find chapter by ID and set as active
                        const clickedChapter = chapters.find(c => c.id === id);
                        if (clickedChapter) {
                            setActiveChapterNumber(clickedChapter.number);
                            setMobileView('editor');
                        }
                    }}
                />
            </main>

            <div className="relative z-[60]">
                <MobileFloatingNav
                    activeTab={mobileView === 'context' ? (activeTab === 'research' ? 'research' : activeTab === 'chat' ? 'chat' : 'diagrams') : 'write'}
                    onTabChange={handleMobileTabChange}
                />
            </div>

            {/* Editor Overlay */}
            {mobileView === 'editor' && activeChapter && (
                <SectionEditor
                    title={`Chapter ${activeChapter.number}`}
                    content={activeChapter.content}
                    wordCount={activeChapter.wordCount}
                    onClose={() => setMobileView('timeline')}
                    onSave={(content) => {
                        handleSave(content);
                    }}
                    onOpenChat={() => {
                        handleMobileTabChange('chat');
                    }}
                    onEnhanceClick={(text) => {
                        setContentToEnhance(text);
                        setShowEnhancePopover(true);
                    }}
                    projectId={projectId}
                    chapterNumber={activeChapter.number}
                    currentVersion={activeChapter.version || 1}
                    onExport={() => setShowExportModal(true)}
                />
            )}

            {/* Context Overlay (Mobile Research/Chat) */}
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
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                                <Layout className="w-16 h-16 text-gray-700 mb-6" />
                                <h3 className="text-gray-500 font-bold">Diagrams coming soon</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Enhance Popover - shared across desktop/mobile */}
            {showEnhancePopover && activeChapter && (
                <EnhanceOptionsPopover
                    projectId={projectId}
                    chapterNumber={activeChapterNumber}
                    selectedContent={contentToEnhance}
                    chapterContext={activeChapter.content}
                    onApply={(enhancedContent) => {
                        // Replace the selected content in chapter
                        const newContent = activeChapter.content === contentToEnhance
                            ? enhancedContent
                            : activeChapter.content.replace(contentToEnhance, enhancedContent);
                        handleSave(newContent);
                    }}
                    onClose={() => setShowEnhancePopover(false)}
                />
            )}

            {/* Export Modal */}
            <DownloadOptionsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={async (format, options) => {
                    let exportChapters = chapters;
                    // Sync before export
                    try {
                        const response = await fetch(`/api/projects/${projectId}/chapters`);
                        const data = await response.json();
                        if (data.success && data.chapters && Array.isArray(data.chapters)) {
                            // Map and merge with current state (simplified map for export)
                            exportChapters = data.chapters.map((c: any) => ({
                                number: c.number,
                                title: c.title,
                                content: c.content
                            }));
                        }
                    } catch (e) {
                        console.error("Export sync failed", e);
                    }

                    const fullContent = exportChapters
                        .sort((a, b) => a.number - b.number)
                        .map(c => `# Chapter ${c.number}: ${c.title}\n\n${c.content}`)
                        .join('\n\n');
                    const title = projectTitle || 'Project Export';
                    const filename = sanitizeFilename(title);

                    if (format === 'markdown') {
                        const blob = generateMarkdownBlob(fullContent, title);
                        downloadFile(blob, `${filename}.md`);
                    } else {
                        const blob = await generateDocxBlob(fullContent, title, options);
                        downloadFile(blob, `${filename}.docx`);
                    }
                }}
                title="Export Project"
            />
        </div>
    );
}
