'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, BookOpen, Expand, Minimize2, X, Check, Loader2, RotateCcw } from 'lucide-react';

type EnhanceType = 'clarity' | 'academic' | 'expand' | 'shorten';

interface EnhanceOptionsPopoverProps {
    projectId: string;
    chapterNumber: number;
    selectedContent: string;
    onApply: (enhancedContent: string) => void;
    onClose: () => void;
    /** Optional: Full chapter content for context */
    chapterContext?: string;
}

const enhanceOptions = [
    { type: 'clarity' as EnhanceType, icon: Wand2, label: 'Clarity', description: 'Clearer & concise' },
    { type: 'academic' as EnhanceType, icon: BookOpen, label: 'Academic', description: 'Formal polish' },
    { type: 'expand' as EnhanceType, icon: Expand, label: 'Expand', description: 'Add more detail' },
    { type: 'shorten' as EnhanceType, icon: Minimize2, label: 'Shorten', description: 'Condense' },
];

export function EnhanceOptionsPopover({
    projectId,
    chapterNumber,
    selectedContent,
    onApply,
    onClose,
    chapterContext
}: EnhanceOptionsPopoverProps) {
    const [stage, setStage] = useState<'select' | 'streaming' | 'preview'>('select');
    const [selectedType, setSelectedType] = useState<EnhanceType | null>(null);
    const [enhancedContent, setEnhancedContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleEnhance = async (type: EnhanceType) => {
        setSelectedType(type);
        setStage('streaming');
        setIsStreaming(true);
        setEnhancedContent('');

        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}/enhance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionContent: selectedContent,
                    enhanceType: type,
                    chapterContext
                }),
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) throw new Error('Enhancement failed');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let accumulated = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    accumulated += chunk;
                    setEnhancedContent(accumulated);
                }
            }

            setIsStreaming(false);
            setStage('preview');

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Enhancement error:', error);
            }
            setIsStreaming(false);
            setStage('select');
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStreaming(false);
        setStage('select');
        setEnhancedContent('');
    };

    const handleAccept = () => {
        onApply(enhancedContent);
        onClose();
    };

    const handleRetry = () => {
        if (selectedType) {
            handleEnhance(selectedType);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-writing border border-rule rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-rust" />
                        <h2 className="font-semibold text-ink">
                            {stage === 'select' && 'Enhance with AI'}
                            {stage === 'streaming' && 'Enhancing...'}
                            {stage === 'preview' && 'Review Changes'}
                        </h2>
                    </div>
                    <button
                        onClick={isStreaming ? handleCancel : onClose}
                        className="p-1.5 hover:bg-selection rounded-lg text-ink-muted hover:text-ink"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {stage === 'select' && (
                        <div className="space-y-4">
                            <p className="text-ink-muted text-sm">
                                Selected: <span className="text-ink">{selectedContent.length} characters</span>
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {enhanceOptions.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.type}
                                            onClick={() => handleEnhance(option.type)}
                                            className="p-4 bg-selection hover:bg-selection border border-rule hover:border-rust rounded-xl text-left transition-all group"
                                        >
                                            <Icon className="w-5 h-5 text-rust mb-2" />
                                            <p className="font-medium text-ink">{option.label}</p>
                                            <p className="text-xs text-ink-muted">{option.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {stage === 'streaming' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-rust">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Enhancing your text...</span>
                            </div>
                            <div className="bg-paper rounded-lg p-4 min-h-[200px]">
                                <pre className="text-sm text-ink whitespace-pre-wrap font-sans">
                                    {enhancedContent || 'Waiting for response...'}
                                </pre>
                            </div>
                        </div>
                    )}

                    {stage === 'preview' && (
                        <div className="space-y-4">
                            {/* Original */}
                            <div>
                                <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Original</h3>
                                <div className="bg-paper rounded-lg p-3 max-h-32 overflow-y-auto">
                                    <p className="text-sm text-ink-muted whitespace-pre-wrap">{selectedContent}</p>
                                </div>
                            </div>

                            {/* Enhanced */}
                            <div>
                                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">Enhanced</h3>
                                <div className="bg-selection border border-rule rounded-lg p-3 max-h-48 overflow-y-auto">
                                    <pre className="text-sm text-ink whitespace-pre-wrap font-sans">{enhancedContent}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {stage === 'preview' && (
                    <div className="px-4 py-3 border-t border-rule flex items-center justify-between">
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-3 py-1.5 text-ink-muted hover:text-ink transition-colors text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Try Again
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-ink-muted hover:text-ink transition-colors text-sm"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex items-center gap-2 px-4 py-2 bg-rust text-writing rounded-lg hover:bg-rust/90 transition-colors text-sm font-medium"
                            >
                                <Check className="w-4 h-4" />
                                Apply Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
