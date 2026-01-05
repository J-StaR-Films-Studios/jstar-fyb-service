'use client';

import { Bold, Italic, List, Sparkles, Maximize2 } from 'lucide-react';
import { useRef, useEffect, useCallback, useState, ReactNode } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface WritingCanvasProps {
    title?: string;
    content?: string;
    onValidChange?: (content: string) => void;
    headerRight?: ReactNode;
    /** Optional external save status - if not provided, uses internal state */
    saveStatus?: SaveStatus;
    /** Callback when Enhance button is clicked - receives selected text or full content */
    onEnhanceClick?: (selectedText: string) => void;
}

export function WritingCanvas({ title, content, onValidChange, headerRight, saveStatus: externalSaveStatus, onEnhanceClick }: WritingCanvasProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localContent, setLocalContent] = useState(content || '');
    const [internalSaveStatus, setInternalSaveStatus] = useState<SaveStatus>('idle');

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
    const insertFormatting = (format: 'bold' | 'italic' | 'list') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

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
            case 'list':
                newText = `\n- ${selectedText || 'List item'}`;
                cursorOffset = 0;
                break;
        }

        const newContent = localContent.substring(0, start) + newText + localContent.substring(end);
        setLocalContent(newContent);
        debouncedSave(newContent);

        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            const newPos = start + newText.length + cursorOffset;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };



    return (
        <div className="flex-1 flex flex-col relative bg-[#050508] h-full overflow-hidden">

            {/* Editor Toolbar */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-dark/50 backdrop-blur z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-sm hidden md:inline-block">{title || 'Select a section...'}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={() => insertFormatting('bold')}
                        className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => insertFormatting('italic')}
                        className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => insertFormatting('list')}
                        className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button
                        onClick={() => {
                            const textarea = textareaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selected = start !== end ? localContent.substring(start, end) : localContent;
                            onEnhanceClick?.(selected);
                        }}
                        className="px-3 py-1.5 bg-primary/20 text-primary text-xs font-bold rounded hover:bg-primary/30 transition-colors flex items-center gap-2"
                    >
                        <Sparkles className="w-3 h-3" /> Enhance
                    </button>
                </div>
                {headerRight || <div className="w-4 md:w-24"></div>}
            </div>

            {/* Scrollable Canvas - This is the only scroll container */}
            <div className="flex-1 overflow-y-auto w-full flex justify-center p-4 md:p-8 bg-[#050508]">
                <div className="w-full max-w-5xl pb-32">
                    <textarea
                        ref={textareaRef}
                        className="w-full min-h-[600px] bg-transparent outline-none text-lg md:text-xl leading-relaxed text-gray-200 resize-none font-serif placeholder-gray-700 focus:placeholder-gray-600 transition-colors px-4"
                        spellCheck={false}
                        placeholder="Start writing or generate content..."
                        value={localContent}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* FAB: Focus Mode */}
            <button
                className="absolute bottom-8 right-8 w-12 h-12 bg-black/50 hover:bg-primary border border-white/10 hover:border-primary rounded-full flex items-center justify-center transition-all group shadow-2xl z-20"
                title="Focus Mode"
            >
                <Maximize2 className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>

        </div>
    );
}
