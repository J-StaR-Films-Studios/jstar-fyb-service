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
        <div className="fixed inset-0 z-50 bg-[#030014] text-white flex flex-col animate-in slide-in-from-bottom duration-300">

            {/* Top Bar */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/20 shrink-0">
                <button onClick={onClose} className="text-gray-400 hover:text-white p-2 -ml-2">
                    <X className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="font-bold text-sm text-gray-200">{title}</h2>
                    {/* Status Indicator */}
                    {saveStatus === 'idle' ? (
                        <span className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div> Editing
                        </span>
                    ) : saveStatus === 'saving' ? (
                        <span className="text-[10px] text-yellow-400 flex items-center justify-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                        </span>
                    ) : (
                        <span className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Saved
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
                            className="text-gray-400 hover:text-white p-2"
                            title="Export"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={handleDone} className="text-primary font-bold text-sm">
                        Done
                    </button>
                </div>
            </header>

            {/* Editor Canvas */}
            <main className="flex-1 p-6 pb-32 overflow-y-auto">
                <NovelEditor
                    content={initialContent}
                    onUpdate={handleContentUpdate}
                    projectId={projectId}
                    onEditorReady={handleEditorReady}
                    className="min-h-[calc(100vh-250px)]"
                />
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
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl z-50">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('bold')}
                    className="text-white hover:text-primary transition-colors"
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('italic')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('heading')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Heading"
                >
                    <Heading className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('list')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="List"
                >
                    <List className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('image')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Image"
                >
                    <Image className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleFormatting('table')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Table"
                >
                    <TableIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Bottom Action Bar */}
            <footer className="h-16 border-t border-white/10 bg-black/40 px-6 flex items-center justify-between shrink-0 mb-safe">
                <span className="text-xs text-gray-500 font-mono">{currentWordCount} words</span>

                {/* Smart Action Button */}
                <button
                    onClick={handleEnhance}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                    <Sparkles className="w-4 h-4 fill-white" /> Enhance
                </button>

                <div className="flex gap-2">
                    {onOpenChat && (
                        <button
                            onClick={() => {
                                onSave(latestContentRef.current);
                                onOpenChat();
                            }}
                            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    )}
                    <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <Mic className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </footer>

        </div>
    );
}
