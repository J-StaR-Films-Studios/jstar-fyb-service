"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopicChangeWarningModalProps {
    isOpen: boolean;
    onProceed: () => void;
    onCancel: () => void;
    projectTopic: string;
}

/**
 * Warning modal shown when a user enters the builder after their topic switch was approved.
 * Warns them that proceeding will clear their content (already archived) and let them pick a new topic.
 */
export function TopicChangeWarningModal({
    isOpen,
    onProceed,
    onCancel,
    projectTopic
}: TopicChangeWarningModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay for animation
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className={`relative bg-[#0f0f15] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Close button */}
                <button
                    onClick={onCancel}
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
                    Topic Switch Approved
                </h2>

                {/* Message */}
                <p className="text-gray-400 text-center text-sm mb-6">
                    Your request to change your topic was approved. Your previous work on
                    <span className="text-white font-medium"> "{projectTopic}"</span> has been
                    archived for reference.
                </p>

                {/* Info Box */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
                    <p className="text-amber-400 text-sm text-center">
                        Proceeding will let you choose a new topic. A fresh abstract and
                        outline will be generated for your new topic.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onProceed}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        Choose New Topic
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-colors"
                    >
                        Go Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
