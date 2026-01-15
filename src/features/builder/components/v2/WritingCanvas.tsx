'use client';

import { useState, useCallback, ReactNode } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Bold, Italic, List, Image as ImageIcon, Heading, Sparkles, Table as TableIcon } from 'lucide-react';
import { ImagePickerDialog } from './ImagePickerDialog';
import { NovelEditor } from './NovelEditor';
import { type Editor as TipTapEditor } from '@tiptap/core';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface WritingCanvasProps {
    title?: string;
    content?: string;
    onValidChange?: (content: string) => void;
    headerRight?: ReactNode;
    /** Optional external save status - if not provided, uses internal state */
    saveStatus?: SaveStatus;
    /** Callback when Enhance button is clicked - receives selected text or full content */
    onEnhanceClick?: (selectedText: string) => void;
    /** Callback when editor instance is ready */
    onEditorReady?: (editor: TipTapEditor) => void;
    projectId: string;
}

export function WritingCanvas({ title, content, onValidChange, headerRight, saveStatus: externalSaveStatus, onEnhanceClick, onEditorReady, projectId }: WritingCanvasProps) {
    const [editor, setEditor] = useState<TipTapEditor | null>(null);
    const [internalSaveStatus, setInternalSaveStatus] = useState<SaveStatus>('idle');
    const [showImagePicker, setShowImagePicker] = useState(false);

    // Use external status if provided, otherwise internal
    const saveStatus = externalSaveStatus ?? internalSaveStatus;

    // Debounced save callback - 1.5 second delay
    const debouncedSave = useDebouncedCallback(
        (newContent: string) => {
            setInternalSaveStatus('saving');
            onValidChange?.(newContent);
            // After calling onValidChange, assume save initiated
            // Parent component should update saveStatus on completion
            // For now, auto-transition to 'saved' after brief delay
            setTimeout(() => setInternalSaveStatus('saved'), 500);
            // Reset to idle after 2 seconds
            setTimeout(() => setInternalSaveStatus('idle'), 2500);
        },
        1500
    );

    const handleContentUpdate = useCallback((newContent: string) => {
        debouncedSave(newContent);
    }, [debouncedSave]);

    const handleEditorReady = useCallback((e: any) => {
        setEditor(e);
        onEditorReady?.(e);
    }, [onEditorReady]);

    // Rich text formatting helper - mapped to Novel/TipTap commands
    const toggleFormatting = (format: 'bold' | 'italic' | 'list' | 'heading' | 'image' | 'table') => {
        if (!editor) return;

        switch (format) {
            case 'bold':
                // @ts-ignore
                editor.chain().focus().toggleBold().run();
                break;
            case 'italic':
                // @ts-ignore
                editor.chain().focus().toggleItalic().run();
                break;
            case 'heading':
                // @ts-ignore
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case 'list':
                // @ts-ignore
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'image':
                setShowImagePicker(true);
                break;
            case 'table':
                // @ts-ignore
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
        }
    };

    const handleImageInsert = (imageMarkdown: string) => {
        if (!editor) return;

        // Extract URL and Alt from markdown: ![alt](url)
        const match = imageMarkdown.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
            const [, alt, src] = match;
            // @ts-ignore
            editor.chain().focus().setImage({ src, alt }).run();
        } else {
            // Fallback just insert text if parsing fails
            editor.chain().focus().insertContent(imageMarkdown).run();
        }
    };

    const handleEnhance = () => {
        if (!onEnhanceClick) return;

        if (!editor) {
            console.warn("Editor not initialized");
            return;
        }

        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');

        // If no text selected, might want to grab all or current paragraph?
        // For now, mirroring previous behavior: pass empty if nothing selected, 
        // OR pass full content? Previous impl passed selection or full content if start===end?
        // Let's pass selection if exists, else full content.

        if (!text && from === to) {
            // @ts-ignore
            const fullText = editor.storage.markdown?.getMarkdown() || '';
            onEnhanceClick(fullText);
        } else {
            onEnhanceClick(text);
        }
    }

    return (
        <div className="flex-1 flex flex-col relative bg-[#050508] h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 shrink-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    {title && <h2 className="text-sm font-bold text-gray-400 mr-4 uppercase tracking-wider">{title}</h2>}
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button onClick={() => toggleFormatting('bold')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Bold">
                        <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleFormatting('italic')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Italic">
                        <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleFormatting('heading')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Heading">
                        <Heading className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleFormatting('list')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="List">
                        <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleFormatting('image')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Image">
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleFormatting('table')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Table">
                        <TableIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {headerRight}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 md:px-12 lg:px-16">
                <div className="max-w-4xl mx-auto h-full min-h-[500px]">
                    <NovelEditor
                        content={content || ''}
                        onUpdate={handleContentUpdate}
                        projectId={projectId}
                        onEditorReady={handleEditorReady}
                    />
                </div>
            </div>

            {/* Floating Action Button for AI Encode/Enhance */}
            <div className="absolute bottom-8 right-8 z-20">
                <button
                    onClick={handleEnhance}
                    className="group flex items-center gap-2 pl-4 pr-5 py-3 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold text-sm tracking-wide">ENHANCE</span>
                </button>
            </div>

            {/* Image Picker Dialog */}
            {showImagePicker && (
                <ImagePickerDialog
                    projectId={projectId}
                    onClose={() => setShowImagePicker(false)}
                    onInsert={handleImageInsert}
                />
            )}
        </div>
    );
}
