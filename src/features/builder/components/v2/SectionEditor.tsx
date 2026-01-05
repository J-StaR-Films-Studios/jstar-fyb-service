'use client';

import { useState, useMemo, useRef } from 'react';
import { X, Bold, Heading, List, Image, Mic, Sparkles, MessageSquare, Check, Loader2, Italic } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { VersionHistoryDropdown } from './VersionHistoryDropdown';
import { ImagePickerDialog } from './ImagePickerDialog';

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
}

export function SectionEditor({ title, content: initialContent, wordCount: initialWordCount = 0, onClose, onSave, onOpenChat, projectId, chapterNumber, currentVersion, onEnhanceClick }: SectionEditorProps) {
    const [editedContent, setEditedContent] = useState(initialContent);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [showImagePicker, setShowImagePicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Calculate word count on the fly
    const currentWordCount = useMemo(() => {
        return editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;
    }, [editedContent]);

    // Debounced auto-save - 1.5 second delay
    const debouncedSave = useDebouncedCallback(
        (content: string) => {
            setSaveStatus('saving');
            onSave(content);
            setTimeout(() => setSaveStatus('saved'), 400);
            setTimeout(() => setSaveStatus('idle'), 2000);
        },
        1500
    );

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setEditedContent(newContent);
        debouncedSave(newContent);
    };

    const handleDone = () => {
        // Force immediate save on Done
        debouncedSave.flush();
        onSave(editedContent);
        onClose();
    };

    const handleEnhance = () => {
        if (!onEnhanceClick) return;
        const textarea = textareaRef.current;
        if (!textarea) {
            onEnhanceClick(editedContent);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = start !== end ? editedContent.substring(start, end) : editedContent;
        onEnhanceClick(selected);
    };

    const handleImageInsert = (imageMarkdown: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newContent = editedContent.substring(0, start) + imageMarkdown + editedContent.substring(end);
        setEditedContent(newContent);
        debouncedSave(newContent);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + imageMarkdown.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Rich text formatting helper
    const insertFormatting = (format: 'bold' | 'heading' | 'list' | 'image' | 'italic') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        if (format === 'image') {
            setShowImagePicker(true);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = editedContent.substring(start, end);

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

        const newContent = editedContent.substring(0, start) + newText + editedContent.substring(end);
        setEditedContent(newContent);
        debouncedSave(newContent);

        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            const newPos = start + newText.length + cursorOffset;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Save status indicator
    const StatusIndicator = () => {
        if (saveStatus === 'idle') {
            return (
                <span className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div> Editing
                </span>
            );
        }
        if (saveStatus === 'saving') {
            return (
                <span className="text-[10px] text-yellow-400 flex items-center justify-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
            );
        }
        return (
            <span className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                <Check className="w-2.5 h-2.5" /> Saved
            </span>
        );
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
                    <StatusIndicator />
                </div>
                <div className="flex items-center gap-2">
                    <VersionHistoryDropdown
                        projectId={projectId}
                        chapterNumber={chapterNumber}
                        currentVersion={currentVersion}
                        currentContent={editedContent}
                        onRestore={(content) => {
                            setEditedContent(content);
                            onSave(content);
                        }}
                    />
                    <button onClick={handleDone} className="text-primary font-bold text-sm">
                        Done
                    </button>
                </div>
            </header>

            {/* Editor Canvas */}
            <main className="flex-1 p-6 overflow-y-auto">
                <textarea
                    ref={textareaRef}
                    className="w-full h-full bg-transparent outline-none text-lg leading-loose resize-none text-gray-200 placeholder-gray-700 font-light font-sans"
                    placeholder="Structure your thoughts here..."
                    value={editedContent}
                    onChange={handleContentChange}
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
                    onClick={() => insertFormatting('bold')}
                    className="text-white hover:text-primary transition-colors"
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('italic')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('heading')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Heading"
                >
                    <Heading className="w-4 h-4" />
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('list')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="List"
                >
                    <List className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('image')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Image"
                >
                    <Image className="w-4 h-4" />
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
                                onSave(editedContent);
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
