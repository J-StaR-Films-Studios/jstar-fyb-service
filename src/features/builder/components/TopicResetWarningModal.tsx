"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight, X, Mail } from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";

interface TopicResetWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTopic: string;
    projectId?: string | null;
    topicSwitchCount: number;
}

/**
 * Warning modal shown when an unpaid/unlocked user wants to change their topic.
 * Warns that abstract and outline will be regenerated.
 */
export function TopicResetWarningModal({
    isOpen,
    onClose,
    currentTopic,
    projectId,
    topicSwitchCount
}: TopicResetWarningModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const limitReached = topicSwitchCount >= 1;

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (limitReached) return;

        try {
            setIsResetting(true);

            // If we have a project ID, call server to track the switch
            if (projectId) {
                const res = await fetch(`/api/projects/${projectId}/reset-topic`, {
                    method: "POST"
                });

                if (!res.ok) {
                    throw new Error("Failed to reset project");
                }
            }

            // Clear abstract and outline, go back to TOPIC step
            useBuilderStore.setState((state) => ({
                data: {
                    ...state.data,
                    abstract: "",
                    outline: [],
                    topicSwitchCount: (state.data.topicSwitchCount || 0) + 1
                },
                step: "TOPIC"
            }));
            onClose();
        } catch (error) {
            console.error("Topic reset failed", error);
            // Fallback for offline/unpaid if needed, or show error
            // For now, we still reset client side to not block user, but warn
        } finally {
            setIsResetting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative bg-[#0f0f15] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Warning Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                    Change Your Topic?
                </h2>

                {/* Message */}
                <p className="text-gray-400 text-center text-sm mb-6">
                    Changing your topic will require regenerating both your
                    <span className="text-white font-medium"> abstract</span> and
                    <span className="text-white font-medium"> project outline</span>.
                </p>

                {/* Info Box */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
                    <p className="text-amber-400 text-sm text-center">
                        Current topic: <strong>"{currentTopic}"</strong>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {limitReached ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-2">
                            <h3 className="text-red-500 font-bold flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                Limit Reached
                            </h3>
                            <p className="text-xs text-red-400">
                                You have already changed your topic once. To ensure project stability, further changes are restricted.
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleConfirm}
                            disabled={isResetting}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isResetting ? "Processing..." : "Yes, Change Topic"}
                            {!isResetting && <ArrowRight className="w-4 h-4" />}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-colors"
                    >
                        {limitReached ? "Back to Project" : "Keep Current Topic"}
                    </button>
                </div>

                {/* Bulk Account Upsell */}
                <div className="mt-6 pt-4 border-t border-white/5">
                    <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                        <Mail className="w-3 h-3" />
                        Need multiple projects? <a href="mailto:hello@jstarstudios.com" className="text-primary hover:underline">Contact us</a> for bulk accounts.
                    </p>
                </div>
            </div>
        </div>
    );
}
