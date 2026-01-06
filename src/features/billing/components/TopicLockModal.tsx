
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock, X } from "lucide-react";
import { createPortal } from "react-dom";

interface TopicLockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    topic: string;
}

export function TopicLockModal({ isOpen, onClose, onConfirm, topic }: TopicLockModalProps) {
    const [acknowledged, setAcknowledged] = useState(false);

    if (!isOpen) return null;

    // Use createPortal to ensure it renders on top of everything
    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md bg-[#0F0F12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 mb-4 border border-amber-500/30">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Topic Lock Warning</h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-gray-300 text-sm leading-relaxed">
                            <strong className="text-white block mb-2">You are about to lock this topic:</strong>
                            <span className="italic text-amber-400">"{topic}"</span>
                        </p>

                        <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-sm">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-2 text-gray-400">
                                    <p>Once paid, you <span className="text-white font-medium">cannot change your topic</span> essentially.</p>
                                    <p>One payment covers <strong>one approved topic</strong>.</p>
                                    <p>If your supervisor rejects this topic later, you will need to submit proof to request a switch.</p>
                                </div>
                            </div>
                        </div>

                        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(e) => setAcknowledged(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-black checked:bg-amber-500 checked:border-amber-500 transition-all"
                                />
                                <CheckIcon className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100" />
                            </div>
                            <span className="text-sm text-gray-300 select-none pt-0.5">
                                I verify that this topic is approved by my supervisor and understand it cannot be changed freely after payment.
                            </span>
                        </label>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={!acknowledged}
                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                            >
                                Confirm & Pay
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}
