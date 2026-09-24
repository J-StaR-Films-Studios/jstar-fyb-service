'use client';

import { useBuilderStore } from "@/features/builder/store/useBuilderStore";
import { useState, useEffect, useRef } from "react";
import { Sparkles, MessageSquare, X } from "lucide-react";
import Link from "next/link";

export function TopicSelector() {
    const { data, updateData, setStep, isFromChat, hydrateFromChat, clearChatData } = useBuilderStore();
    const [topic, setTopic] = useState(data.topic);
    const [twist, setTwist] = useState(data.twist);
    const hasHydratedRef = useRef(false);

    // Hydrate from chat handoff on mount (only once)
    useEffect(() => {
        if (hasHydratedRef.current) return; // Already hydrated

        const hydrated = hydrateFromChat();
        if (hydrated) {
            hasHydratedRef.current = true;
            // Get the state directly after hydration
            const currentTopic = useBuilderStore.getState().data.topic;
            const currentTwist = useBuilderStore.getState().data.twist;

            setTopic(currentTopic);
            setTwist(currentTwist);
        }
    }, [hydrateFromChat]); // Only include hydrateFromChat

    const handleConfirm = () => {
        if (!topic.trim()) return;
        updateData({ topic, twist });
        setStep('ABSTRACT');
    };

    const handleClearChatData = () => {
        clearChatData();
        setTopic('');
        setTwist('');
    };

    return (
        <div className="bg-writing border border-rule rounded-md p-4 md:p-8">
            <h2 className="text-2xl font-margin font-bold mb-2 text-ink">Project Foundation</h2>
            <p className="text-ink-muted mb-6 text-sm">Define the core subject and the unique innovative angle.</p>

            {/* Chat Handoff Badge */}
            {isFromChat && (
                <div className="flex items-center justify-between mb-6 p-3 bg-selection rounded-xl border border-rule">
                    <span className="text-sm text-rust flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Topic imported from Jay
                    </span>
                    <button
                        onClick={handleClearChatData}
                        className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear & Start Fresh
                    </button>
                </div>
            )}

            <div className="space-y-6 mb-8">
                <div>
                    <label className="block text-xs font-mono uppercase text-ink mb-2">Project Topic</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-writing border border-rule rounded-md px-4 py-4 text-ink placeholder-ink-muted focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust transition-all font-light"
                        placeholder="e.g. AI-Powered Fraud Detection"
                    />
                </div>

                <div>
                    <label className="block text-xs font-mono uppercase text-ink mb-2">The "Twist" (Unique Angle)</label>
                    <textarea
                        value={twist}
                        onChange={(e) => setTwist(e.target.value)}
                        className="w-full bg-writing border border-rule rounded-md px-4 py-4 text-ink placeholder-ink-muted focus:border-rust focus:outline-none focus:ring-1 focus:ring-rust transition-all h-32 resize-none font-light leading-relaxed"
                        placeholder="e.g. Using Blockchain for immutable audit trails and Zero-Knowledge Proofs for privacy..."
                    />
                </div>
            </div>

            <button
                onClick={handleConfirm}
                disabled={!topic.trim()}
                className="w-full py-4 bg-rust rounded-md font-margin font-bold uppercase tracking-wide  transition-all disabled:bg-selection disabled:text-ink-muted disabled:cursor-not-allowed text-writing flex items-center justify-center gap-2"
            >
                <Sparkles className="w-5 h-5" />
                Generate Abstract
            </button>

            <div className="mt-6 text-center">
                <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors group"
                >
                    <MessageSquare className="w-4 h-4 group-hover:text-rust transition-colors" />
                    <span>Don't have a topic yet? Chat with Jay</span>
                </Link>
            </div>
        </div>
    );
}
