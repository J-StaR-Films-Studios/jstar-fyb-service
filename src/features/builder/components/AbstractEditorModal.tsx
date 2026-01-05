"use client";

import { useState, useEffect, useRef } from "react";
import { X, FileText, Loader2, Sparkles, Send, RefreshCw, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useBuilderStore } from "../store/useBuilderStore";
import { useCompletion } from '@ai-sdk/react';
import { cn } from "@/lib/utils";

interface AbstractEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    initialAbstract: string;
}

export function AbstractEditorModal({
    isOpen,
    onClose,
    projectId,
    initialAbstract
}: AbstractEditorModalProps) {
    const { updateData, data } = useBuilderStore();
    const [isSaving, setIsSaving] = useState(false);
    const [refineInput, setRefineInput] = useState("");

    // AI Completion Hook
    const { completion, complete, isLoading, setCompletion } = useCompletion({
        api: '/api/generate/abstract',
        streamProtocol: 'text',
        initialCompletion: initialAbstract,
        onFinish: (prompt, result) => {
            // Optional: Auto-update local state on finish if needed
        },
        onError: (err) => {
            toast.error("AI Generation failed. Please try again.");
            console.error(err);
        }
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCompletion(initialAbstract);
        }
    }, [isOpen, initialAbstract, setCompletion]);

    const handleSave = async () => {
        if (!completion?.trim()) {
            toast.error("Abstract cannot be empty");
            return;
        }

        try {
            setIsSaving(true);
            const res = await fetch(`/api/projects/${projectId}/abstract`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ abstract: completion })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save");
            }

            updateData({ abstract: completion });
            toast.success("Abstract updated successfully!");
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to save abstract");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRefine = () => {
        if (!refineInput.trim()) return;

        // Pass the topic/twist from store + instruction
        complete("", {
            body: {
                topic: data.topic,
                twist: data.twist,
                instruction: refineInput
            }
        });
        setRefineInput("");
    };

    const handleRegenerate = () => {
        complete("", { body: { topic: data.topic, twist: data.twist } });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Ambient Background */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-3xl h-[85vh] bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10">

                {/* Compact Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-white/5">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold font-display text-white">Edit Abstract</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline-block">
                            {completion?.split(/\s+/).filter(Boolean).length || 0} WORDS
                        </span>
                        <div className="h-4 w-px bg-white/10 hidden sm:block" />
                        <button
                            onClick={handleRegenerate}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                            <span>Regenerate</span>
                        </button>
                        <div className="h-4 w-px bg-white/10" />
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Editor Area - grow to fill space */}
                <div className="flex-1 relative group w-full">
                    <textarea
                        value={completion}
                        onChange={(e) => setCompletion(e.target.value)}
                        className="w-full h-full bg-transparent border-none p-6 md:p-8 text-white/90 placeholder-gray-700 resize-none focus:ring-0 text-base md:text-lg font-serif leading-relaxed custom-scrollbar selection:bg-primary/30"
                        placeholder="Your abstract will appear here..."
                        spellCheck={false}
                    />
                </div>

                {/* Compact Footer */}
                <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl shrink-0">
                    <div className="flex flex-col gap-3">

                        {/* Refine Input */}
                        <div className="relative w-full group">
                            <div className="relative flex items-center bg-black/60 border border-white/10 rounded-xl overflow-hidden focus-within:border-white/20 transition-colors">
                                <div className="pl-3 text-primary">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={refineInput}
                                    onChange={(e) => setRefineInput(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Ask AI to refine..."
                                    className="w-full bg-transparent border-none px-3 py-2.5 text-sm text-white focus:ring-0 placeholder-gray-600 font-light"
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                />
                                <button
                                    onClick={handleRefine}
                                    disabled={!refineInput.trim() || isLoading}
                                    className="mr-1.5 p-1.5 bg-white/5 rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-0 disabled:scale-90"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !completion?.trim()}
                            className="w-full py-3 bg-primary hover:bg-primary/90 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50 disabled:grayscale"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
