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
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-8">
            <h2 className="text-2xl font-display font-bold mb-2 text-white">Project Foundation</h2>
            <p className="text-gray-400 mb-6 text-sm">Define the core subject and the unique innovative angle.</p>

            {/* Chat Handoff Badge */}
            {isFromChat && (
                <div className="flex items-center justify-between mb-6 p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="text-sm text-primary flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Topic imported from Jay
                    </span>
                    <button
                        onClick={handleClearChatData}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear & Start Fresh
                    </button>
                </div>
            )}

            <div className="space-y-6 mb-8">
                <div>
                    <label className="block text-xs font-mono uppercase text-accent mb-2">Project Topic</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-light"
                        placeholder="e.g. AI-Powered Fraud Detection"
                    />
                </div>

                <div>
                    <label className="block text-xs font-mono uppercase text-accent mb-2">The "Twist" (Unique Angle)</label>
                    <textarea
                        value={twist}
                        onChange={(e) => setTwist(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all h-32 resize-none font-light leading-relaxed"
                        placeholder="e.g. Using Blockchain for immutable audit trails and Zero-Knowledge Proofs for privacy..."
                    />
                </div>
            </div>

            <button
                onClick={handleConfirm}
                disabled={!topic.trim()}
                className="w-full py-4 bg-primary rounded-xl font-display font-bold uppercase tracking-wide shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-white flex items-center justify-center gap-2"
            >
                <Sparkles className="w-5 h-5" />
                Generate Abstract
            </button>

            <div className="mt-6 text-center">
                <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
                >
                    <MessageSquare className="w-4 h-4 group-hover:text-primary transition-colors" />
                    <span>Don't have a topic yet? Chat with Jay</span>
                </Link>
            </div>
        </div>
    );
}
