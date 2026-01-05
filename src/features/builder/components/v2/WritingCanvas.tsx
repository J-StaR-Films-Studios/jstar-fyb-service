'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Bold, Italic, List, Image, Check, Loader2, Heading, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagePickerDialog } from './ImagePickerDialog';

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
    projectId: string;
}

export function WritingCanvas({ title, content, onValidChange, headerRight, saveStatus: externalSaveStatus, onEnhanceClick, projectId }: WritingCanvasProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localContent, setLocalContent] = useState(content || '');
    const [internalSaveStatus, setInternalSaveStatus] = useState<SaveStatus>('idle');
    const [showImagePicker, setShowImagePicker] = useState(false);

    // Use external status if provided, otherwise internal
    const saveStatus = externalSaveStatus ?? internalSaveStatus;

    // Sync local state when content prop changes (e.g., chapter switching)
    useEffect(() => {
        setLocalContent(content || '');
    }, [content]);

    // Auto-resize textarea to fit content
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(textarea.scrollHeight, 600)}px`;
        }
    }, []);

    // Adjust height on content change and initial mount
    useEffect(() => {
        adjustHeight();
    }, [localContent, adjustHeight]);

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

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalContent(newValue);
        adjustHeight();
        // Trigger debounced save
        debouncedSave(newValue);
    };

    // Rich text formatting helper
    const insertFormatting = (format: 'bold' | 'italic' | 'list' | 'image' | 'heading') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        if (format === 'image') {
            setShowImagePicker(true);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = localContent.substring(start, end);

        let newText = '';
        let cursorOffset = 0;

        switch (format) {
            case 'bold':
                newText = `**${selectedText || 'bold text'}**`;
                cursorOffset = selectedText ? 0 : -2;
                break;
            case 'italic':
                newText = `*${selectedText || 'italic text'}*`;
                cursorOffset = selectedText ? 0 : -1;
                break;
            case 'heading':
                newText = `\n## ${selectedText || 'Heading'}\n`;
                cursorOffset = selectedText ? 0 : -1;
                break;
            case 'list':
                newText = `\n- ${selectedText || 'List item'}`;
                cursorOffset = 0;
                break;
        }

        const newContent = localContent.substring(0, start) + newText + localContent.substring(end);
        setLocalContent(newContent);
        debouncedSave(newContent);

        // Restore cursor position and focus
        setTimeout(() => {
            textarea.focus();
            const newPos = start + newText.length + cursorOffset;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleImageInsert = (imageMarkdown: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newContent = localContent.substring(0, start) + imageMarkdown + localContent.substring(end);
        setLocalContent(newContent);
        debouncedSave(newContent);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + imageMarkdown.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleEnhance = () => {
        if (!onEnhanceClick) return;
        const textarea = textareaRef.current;
        if (!textarea) {
            onEnhanceClick(localContent);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = start !== end ? localContent.substring(start, end) : localContent;
        onEnhanceClick(selected);
    }

    return (
        <div className="flex-1 flex flex-col relative bg-[#050508] h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 shrink-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    {title && <h2 className="text-sm font-bold text-gray-400 mr-4 uppercase tracking-wider">{title}</h2>}
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button onClick={() => insertFormatting('bold')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Bold">
                        <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('italic')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Italic">
                        <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('heading')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Heading">
                        <Heading className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('list')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="List">
                        <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('image')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Image">
                        <Image className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {headerRight}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 md:px-12 lg:px-16" onClick={() => textareaRef.current?.focus()}>
                <div className="max-w-4xl mx-auto h-full min-h-[500px]">
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={handleChange}
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-lg leading-loose text-gray-300 placeholder-gray-700 font-serif"
                        placeholder="Start writing your chapter..."
                        spellCheck={false}
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
