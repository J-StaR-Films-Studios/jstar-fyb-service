"use client";

import React, { useState } from "react";
import { Lock, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TopicLockModal } from "@/features/billing/components/TopicLockModal";
import { useSupport } from "@/features/support/context/SupportContext";

interface WorkspaceLockScreenProps {
    projectId: string;
    requiredAmount: number;
    paymentReference?: string;
    projectTopic?: string;
}

export function WorkspaceLockScreen({ projectId, requiredAmount, paymentReference, projectTopic }: WorkspaceLockScreenProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const router = useRouter();
    const { openSupport } = useSupport();

    React.useEffect(() => {
        if (paymentReference) {
            verifyPayment(paymentReference);
        }
    }, [paymentReference]);

    const verifyPayment = async (reference: string) => {
        try {
            setIsVerifying(true);
            const response = await fetch("/api/pay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Verification failed");
            }

            const data = await response.json();
            if (data.success) {
                toast.success("Payment verified! Unlocking workspace...");
                // Reload the page to reflect the new unlocked status from the server
                router.refresh();
            } else {
                throw new Error("Payment could not be verified");
            }
        } catch (error: any) {
            toast.error(error.message || "Verification failed");
            setIsVerifying(false); // Stop verifying to show the lock screen again or error state
        }
    };

    // Step 1: Show warning modal first
    const handleUnlockClick = () => {
        setShowLockModal(true);
    };

    // Step 2: Actually proceed to payment after confirmation
    const proceedToPayment = async () => {
        setShowLockModal(false);

        try {
            setIsLoading(true);
            const response = await fetch("/api/pay/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    callbackUrl: window.location.href // Return to this page after payment
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to initialize payment");
            }

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No payment URL received");
            }
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <h2 className="text-2xl font-bold font-display text-white">Verifying Payment...</h2>
                    <p className="text-gray-400">Please wait while we confirm your transaction.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="glass-panel max-w-lg w-full p-8 md:p-10 rounded-3xl border border-white/10 flex flex-col relative z-10 shadow-2xl backdrop-blur-xl bg-dark/50">
                {/* Header Icon */}
                <div className="self-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-glow ring-1 ring-white/10">
                    <Lock className="w-10 h-10 text-white" />
                </div>

                <div className="text-center space-y-3 mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        Premium Workspace
                    </div>
                    <h1 className="text-3xl font-bold font-display text-white">Unlock Your Project</h1>
                    <p className="text-gray-400 leading-relaxed">
                        Access the full workspace, advanced editing tools, and export features by upgrading this project.
                    </p>
                </div>

                {/* Features List */}
                <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            <span>Full Chapter Editing & Formatting</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            <span>Unlimited AI Refinements</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            <span>Export to PDF & Word</span>
                        </li>
                    </ul>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-center gap-2 mb-8">
                    <span className="text-sm text-gray-500 line-through">₦25,000</span>
                    <span className="text-4xl font-bold font-display text-white">
                        ₦{requiredAmount.toLocaleString()}
                    </span>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleUnlockClick}
                        disabled={isLoading}
                        className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl font-bold text-white uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Initializing...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4" />
                                Unlock Now
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-2">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Secured by Paystack</span>
                    </div>

                    <Link
                        href="/dashboard"
                        className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold text-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <p className="mt-8 text-xs text-gray-600">
                Need help? <button onClick={() => openSupport({ page: 'workspace-lock', projectId })} className="underline hover:text-gray-400">Contact Support</button>
            </p>

            {/* Topic Lock Warning Modal */}
            <TopicLockModal
                isOpen={showLockModal}
                onClose={() => setShowLockModal(false)}
                onConfirm={proceedToPayment}
                topic={projectTopic || "Your Project Topic"}
            />
        </div>
    );
}
