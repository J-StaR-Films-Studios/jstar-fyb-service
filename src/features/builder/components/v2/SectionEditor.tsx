'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { X, Bold, Heading, List, Image, Mic, Sparkles, MessageSquare, Check, Loader2, Italic, Table as TableIcon, Download } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { VersionHistoryDropdown } from './VersionHistoryDropdown';
import { ImagePickerDialog } from './ImagePickerDialog';
import { NovelEditor } from './NovelEditor';
import { type EditorInstance } from 'novel';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface SectionEditorProps {
    title: string;
    content: string;
    wordCount?: number;
    onClose: () => void;
    onSave: (content: string) => void;
    onOpenChat?: () => void;
    projectId: string;
    chapterNumber: number;
    currentVersion: number;
    onEnhanceClick?: (content: string) => void;
    onExport?: () => void;
}

export function SectionEditor({ title, content: initialContent, wordCount: _initialWordCount = 0, onClose, onSave, onOpenChat, projectId, chapterNumber, currentVersion, onEnhanceClick, onExport }: SectionEditorProps) {
    const [editor, setEditor] = useState<EditorInstance | null>(null);
    const [editedContent, setEditedContent] = useState(initialContent);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [showImagePicker, setShowImagePicker] = useState(false);

    // Ref to track the latest content without triggering re-renders
    // Initialized with initialContent
    const latestContentRef = useRef(initialContent);

    // Calculate word count on the fly based on state (which is now debounced)
    const currentWordCount = useMemo(() => {
        return editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;
    }, [editedContent]);

    // Debounced UI update for word count and other reactive elements
    // This prevents re-rendering the whole component on every keystroke
    const debouncedSetEditedContent = useDebouncedCallback(
        (content: string) => {
            setEditedContent(content);
        },
        500, // Update UI every 500ms max
        { maxWait: 2000 }
    );

    // Debounced auto-save - 3 second delay after typing stops
    // maxWait ensures save happens within 10 seconds even during continuous typing
    const debouncedSave = useDebouncedCallback(
        (content: string) => {
            setSaveStatus('saving');
            onSave(content);
            setTimeout(() => setSaveStatus('saved'), 400);
            setTimeout(() => setSaveStatus('idle'), 2000);
        },
        3000,
        { maxWait: 10000 }
    );

    // Memoized handler to ensure NovelEditor props remain stable
    const handleContentUpdate = useCallback((newContent: string) => {
        latestContentRef.current = newContent;
        debouncedSetEditedContent(newContent);
        debouncedSave(newContent);
    }, [debouncedSetEditedContent, debouncedSave]);

    const handleEditorReady = useCallback((e: EditorInstance) => {
        setEditor(e);
    }, []);

    const handleDone = () => {
        // Force immediate save on Done and cancel pending debounced saves
        debouncedSave.cancel();

        // Get the absolute latest content from the editor instance if available
        // This ensures that even if onUpdate is debounced in NovelEditor, we get the current state
        let content = latestContentRef.current;
        if (editor) {
            content = editor.storage.markdown?.getMarkdown?.() || editor.getText();
        }

        onSave(content);
        onClose();
    };

    const handleEnhance = () => {
        if (!onEnhanceClick) return;

        if (!editor) {
            onEnhanceClick(latestContentRef.current);
            return;
        }

        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');

        if (!text && from === to) {
            const fullText = editor.storage.markdown?.getMarkdown() || latestContentRef.current;
            onEnhanceClick(fullText);
        } else {
            onEnhanceClick(text);
        }
    };

    const handleImageInsert = (imageMarkdown: string) => {
        if (!editor) return;

        // Extract URL and Alt from markdown: ![alt](url)
        const match = imageMarkdown.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
            const [, alt, src] = match;
            // @ts-ignore - novel/tiptap types issue
            editor.chain().focus().setImage({ src, alt }).run();
        } else {
            editor.chain().focus().insertContent(imageMarkdown).run();
        }
    };

    // Rich text formatting helper - now uses TipTap commands
    const toggleFormatting = (format: 'bold' | 'heading' | 'list' | 'image' | 'italic' | 'table') => {
        if (format === 'image') {
            setShowImagePicker(true);
            return;
        }

        if (!editor) return;

        switch (format) {
            case 'bold':
                // @ts-ignore - novel/tiptap types issue
                editor.chain().focus().toggleBold().run();
                break;
            case 'italic':
                // @ts-ignore - novel/tiptap types issue
                editor.chain().focus().toggleItalic().run();
                break;
            case 'heading':
                // @ts-ignore - novel/tiptap types issue
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case 'list':
                // @ts-ignore - novel/tiptap types issue
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'table':
                // @ts-ignore - novel/tiptap types issue
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-paper text-ink flex flex-col animate-in slide-in-from-bottom duration-300">

            {/* Top Bar */}
            <header className="px-3 sm:px-6 py-3 flex justify-between items-center gap-2 border-b border-rule bg-writing shrink-0">
                <button onClick={onClose} className="text-ink-muted hover:text-rust p-2 -ml-2">
                    <X className="w-6 h-6" />
                </button>
                <div className="text-center min-w-0">
                    <h2 className="font-bold text-sm text-ink truncate">{title}</h2>
                    {/* Status Indicator */}
                    {saveStatus === 'idle' ? (
                        <span className="text-xs text-ink-muted flex items-center justify-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div> Editing
                        </span>
                    ) : saveStatus === 'saving' ? (
                        <span className="text-xs text-ink-muted flex items-center justify-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                        </span>
                    ) : (
                        <span className="text-xs text-ink-muted flex items-center justify-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Save requested
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <VersionHistoryDropdown
                        projectId={projectId}
                        chapterNumber={chapterNumber}
                        currentVersion={currentVersion}
                        currentContent={editedContent}
                        onRestore={(content) => {
                            setEditedContent(content);
                            latestContentRef.current = content; // Sync ref
                            onSave(content);
                            // Also update the editor content
                            if (editor) {
                                editor.commands.setContent(content);
                            }
                        }}
                    />
                    {/* Export Button (Mobile) */}
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="text-ink-muted hover:text-rust p-2"
                            title="Export"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={handleDone} className="text-rust font-bold text-sm min-h-11 px-2">
                        Done
                    </button>
                </div>
            </header>

            {/* Editor Canvas */}
            <main className="flex-1 p-4 sm:p-6 pb-32 overflow-y-auto"><div className="max-w-[75ch] min-h-full mx-auto bg-writing border border-rule border-l-[5px] border-l-rust p-4 sm:p-8">
                <NovelEditor
                    content={initialContent}
                    onUpdate={handleContentUpdate}
                    projectId={projectId}
                    onEditorReady={handleEditorReady}
                    className="min-h-[calc(100vh-250px)]"
                /></div>
            </main>

            {/* Image Picker Dialog */}
            {showImagePicker && (
                <ImagePickerDialog
                    projectId={projectId}
                    onClose={() => setShowImagePicker(false)}
                    onInsert={handleImageInsert}
                />
            )}

            {/* Floating Formatting Pill */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-writing border border-rule rounded-md px-2 py-1 flex items-center gap-1 max-w-[calc(100vw-2rem)] z-50">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('bold')}
                    className="text-ink hover:text-rust transition-colors"
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('italic')}
                    className="text-ink-muted hover:text-rust transition-colors"
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('heading')}
                    className="text-ink-muted hover:text-rust transition-colors"
                    title="Heading"
                >
                    <Heading className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('list')}
                    className="text-ink-muted hover:text-rust transition-colors"
                    title="List"
                >
                    <List className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('image')}
                    className="text-ink-muted hover:text-rust transition-colors"
                    title="Image"
                >
                    <Image className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('table')}
                    className="text-ink-muted hover:text-rust transition-colors"
                    title="Table"
                >
                    <TableIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Bottom Action Bar */}
            <footer className="min-h-16 border-t border-rule bg-writing px-3 sm:px-6 flex items-center justify-between gap-1 shrink-0 mb-safe">
                <span className="text-xs text-ink-muted font-mono">{currentWordCount} words</span>

                {/* Smart Action Button */}
                <button
                    onClick={handleEnhance}
                    className="flex items-center gap-1 px-2 sm:px-4 min-h-11 bg-rust rounded-md text-writing text-xs font-bold transition-colors"
                >
                    <Sparkles className="w-4 h-4" /> Enhance
                </button>

                <div className="flex gap-2">
                    {onOpenChat && (
                        <button
                            onClick={() => {
                                onSave(latestContentRef.current);
                                onOpenChat();
                            }}
                            className="p-2 bg-selection rounded-md hover:bg-paper transition-colors text-ink-muted hover:text-rust"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    )}
                    <button className="p-2 bg-selection rounded-md hover:bg-paper transition-colors">
                        <Mic className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </footer>

        </div>
    );
}
