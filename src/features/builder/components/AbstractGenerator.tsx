'use client';

import { useBuilderStore } from "@/features/builder/store/useBuilderStore";
import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, Send, Check, RefreshCw, Bot, Edit3, Eye, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCompletion } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import { SkeletonText } from "@/components/ui/Skeleton";
import { createProjectAction } from "@/features/builder/actions/createProject";

export function AbstractGenerator() {
    const { data, updateData, setStep } = useBuilderStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // AI Completion Hook
    const { completion, complete, isLoading, setCompletion } = useCompletion({
        api: '/api/generate/abstract',
        streamProtocol: 'text', // Required for toTextStreamResponse()
        initialCompletion: data.abstract,
        onFinish: (prompt, completion) => {
            updateData({ abstract: completion });
        }
    });

    // Local refinement input
    const [refineInput, setRefineInput] = useState("");
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [completion]);

    // Initial Auto-Start
    useEffect(() => {
        if (!data.abstract && !isLoading) {
            complete("", { body: { topic: data.topic, twist: data.twist } });
        }
    }, []);

    // Fetch stored abstract if we have a project ID and no abstract yet
    useEffect(() => {
        const fetchStoredAbstract = async () => {
            if (data.projectId && !data.abstract && !isLoading) {
                try {
                    const response = await fetch(`/api/projects/${data.projectId}/abstract`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.abstract) {
                            updateData({ abstract: result.abstract });
                            setCompletion(result.abstract);
                        }
                    }
                } catch (error) {
                    console.error('[AbstractGenerator] Failed to fetch stored abstract:', error);
                }
            }
        };
        fetchStoredAbstract();
    }, [data.projectId, data.abstract, isLoading]);

    const handleRefine = () => {
        if (!refineInput) return;
        complete("", { body: { topic: data.topic, twist: data.twist, instruction: refineInput } });
        setRefineInput("");
    };

    const handleApprove = async () => {
        setIsPreviewMode(true);

        // Save to DB
        const res = await createProjectAction({
            topic: data.topic,
            twist: data.twist,
            abstract: completion
        });

        if (res.success && res.projectId) {
            updateData({ abstract: completion, projectId: res.projectId });
            setStep('OUTLINE');
        } else {
            alert("Failed to create project. Please try again.");
            setIsPreviewMode(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header / Status */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-margin font-bold text-ink mb-1">Project Context</h2>
                    <p className="text-sm text-ink-muted">Review and refine the AI-generated abstract before structuring the chapters.</p>
                </div>
                {isLoading && (
                    <div className="flex items-center gap-2 text-ink bg-selection px-4 py-2 rounded-md border border-rule">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-xs uppercase tracking-wider font-bold">AI Writing...</span>
                    </div>
                )}
            </div>

            {/* Main Editor Glass Panel */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-writing border border-rule rounded-md overflow-hidden relative"
            >
                {/* Editor Toolbar */}
                <div className="px-6 py-4 border-b border-rule bg-writing flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-muted">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Abstract Editor</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Preview/Edit Toggle */}
                        {!isLoading && (
                            <button
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`text-xs transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isPreviewMode ? 'bg-selection text-rust' : 'text-ink-muted hover:text-rust hover:bg-selection'}`}
                            >
                                {isPreviewMode ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {isPreviewMode ? 'Edit' : 'Preview'}
                            </button>
                        )}

                        <button
                            onClick={() => complete("", { body: { topic: data.topic, twist: data.twist } })}
                            className="text-xs text-ink-muted hover:text-rust transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-selection"
                            disabled={isLoading}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Regenerate
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-6 md:p-8 bg-writing min-h-[200px] md:min-h-[350px]">
                    {isLoading || isPreviewMode ? (
                        <div className="prose prose-lg max-w-[75ch] font-margin leading-relaxed prose-headings:text-ink prose-p:text-ink prose-strong:text-ink">
                            {completion ? (
                                <ReactMarkdown>{completion}</ReactMarkdown>
                            ) : (
                                <SkeletonText lines={6} />
                            )}
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={completion}
                            onChange={(e) => {
                                setCompletion(e.target.value);
                                updateData({ abstract: e.target.value });
                            }}
                            className="w-full min-h-[150px] md:min-h-[300px] bg-transparent border-none focus:ring-0 text-base md:text-lg font-margin leading-relaxed text-ink resize-none p-0 placeholder-ink-muted focus:outline-none selection:bg-primary/30"
                            placeholder="Waiting for AI generation..."
                        />
                    )}
                </div>

                {/* AI Command Bar */}
                <div className="p-5 bg-paper border-t border-rule">
                    <div className="flex flex-col md:flex-row gap-4 items-center">

                        {/* Refine Input */}
                        <div className="relative flex-1 w-full group">
                            <div className="relative flex items-center bg-writing border border-rule rounded-md overflow-hidden focus-within:border-rust transition-colors">
                                <div className="pl-4 text-rust">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={refineInput}
                                    onChange={(e) => setRefineInput(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Give instructions to refine (e.g. 'Make it more academic')"
                                    className="w-full bg-transparent border-none px-4 py-3.5 text-sm text-ink focus:ring-0 placeholder-ink-muted font-light"
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                />
                                <button
                                    onClick={handleRefine}
                                    disabled={!refineInput || isLoading}
                                    className="mr-2 min-w-11 min-h-11 flex items-center justify-center bg-selection rounded-md text-ink hover:bg-rust hover:text-writing transition-colors disabled:bg-paper disabled:text-ink-muted"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Divider for Mobile */}
                        <div className="w-full h-px bg-rule md:hidden" />

                        {/* Approve Button */}
                        <button
                            onClick={handleApprove}
                            disabled={isLoading}
                            className="w-full md:w-auto px-8 py-3.5 bg-rust hover:bg-rust/90 rounded-md font-margin font-bold text-sm uppercase tracking-wide  transition-all flex items-center justify-center gap-2 disabled:bg-selection disabled:text-ink-muted text-writing"
                        >
                            <Check className="w-5 h-5" />
                            Confirm & Generate
                        </button>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
