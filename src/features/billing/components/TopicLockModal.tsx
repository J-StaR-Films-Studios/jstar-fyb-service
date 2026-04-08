import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock, HeartHandshake } from "lucide-react";
import { createPortal } from "react-dom";
import { DiscountCodeInput } from "@/features/billing/components/DiscountCodeInput";
import { WORKSPACE_UNLOCK_PRICE } from "@/config/pricing";

interface TopicLockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (discountCode?: string) => void;
    topic: string;
    amount?: number;
    isReferred?: boolean;
    showDiscountInput?: boolean;
}

export function TopicLockModal({
    isOpen,
    onClose,
    onConfirm,
    topic,
    amount = WORKSPACE_UNLOCK_PRICE,
    isReferred,
    showDiscountInput = true
}: TopicLockModalProps) {
    const [acknowledged, setAcknowledged] = useState(false);
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const [currentAmount, setCurrentAmount] = useState(amount);

    useEffect(() => {
        if (!isOpen) return;

        const resetState = window.setTimeout(() => {
            setCurrentAmount(amount);
            setAcknowledged(false);
            setDiscountCode(null);
        }, 0);

        return () => window.clearTimeout(resetState);
    }, [amount, isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F12] shadow-2xl"
                >
                    <div className="border-b border-amber-500/20 bg-amber-500/10 p-6 text-center">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 text-amber-500">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Topic Lock Warning</h2>
                    </div>

                    <div className="space-y-4 p-6">
                        <p className="text-sm leading-relaxed text-gray-300">
                            <strong className="mb-2 block text-white">You are about to lock this topic:</strong>
                            <span className="italic text-amber-400">&quot;{topic}&quot;</span>
                        </p>

                        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
                            <div className="flex gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                                <div className="space-y-2 text-gray-400">
                                    <p>Once paid, you <span className="font-medium text-white">cannot change your topic</span> freely.</p>
                                    <p>One payment covers <strong>one approved topic</strong>.</p>
                                </div>
                            </div>
                        </div>

                        {showDiscountInput ? (
                            <div className="pt-1">
                                {isReferred ? (
                                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                                        <div className="flex items-center gap-3">
                                            <HeartHandshake className="h-4 w-4 text-purple-400" />
                                            <div className="text-xs text-purple-300">
                                                <span className="block font-bold text-purple-400">Influencer Support Active</span>
                                                Discount codes are disabled while supporting a creator.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <DiscountCodeInput
                                        originalAmount={amount}
                                        onValidCode={(code, discountAmount) => {
                                            setDiscountCode(code);
                                            setCurrentAmount(amount - discountAmount);
                                        }}
                                        onClear={() => {
                                            setDiscountCode(null);
                                            setCurrentAmount(amount);
                                        }}
                                    />
                                )}
                            </div>
                        ) : null}

                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/5">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(e) => setAcknowledged(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-black transition-all checked:border-amber-500 checked:bg-amber-500"
                                />
                                <CheckIcon className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 peer-checked:opacity-100" />
                            </div>
                            <span className="select-none pt-0.5 text-sm text-gray-300">
                                I verify that this topic is approved by my supervisor and understand it cannot be changed freely after payment.
                            </span>
                        </label>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onConfirm(discountCode || undefined)}
                                disabled={!acknowledged}
                                className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Pay ₦{currentAmount.toLocaleString()}
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
    );
}
