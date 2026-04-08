"use client";

import React, { useState } from "react";
import { Lock, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Loader2, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TopicLockModal } from "@/features/billing/components/TopicLockModal";
import { useSupport } from "@/features/support/context/SupportContext";
import { DiscountCodeInput } from "@/features/billing/components/DiscountCodeInput";

interface WorkspaceLockScreenProps {
    projectId: string;
    requiredAmount: number;
    paymentReference?: string;
    projectTopic?: string;
    isReferred?: boolean;
}

export function WorkspaceLockScreen({
    projectId,
    requiredAmount,
    paymentReference,
    projectTopic,
    isReferred
}: WorkspaceLockScreenProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [finalAmount, setFinalAmount] = useState(requiredAmount);
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const router = useRouter();
    const { openSupport } = useSupport();

    React.useEffect(() => {
        if (!paymentReference) {
            return;
        }

        const verifyPayment = async () => {
            try {
                setIsVerifying(true);
                const response = await fetch("/api/pay/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference: paymentReference }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Verification failed");
                }

                const data = await response.json();
                if (data.success) {
                    toast.success("Payment verified! Unlocking workspace...");
                    router.refresh();
                } else {
                    throw new Error("Payment could not be verified");
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Verification failed";
                toast.error(message);
                setIsVerifying(false);
            }
        };

        void verifyPayment();
    }, [paymentReference, router]);

    const handleUnlockClick = () => {
        setShowLockModal(true);
    };

    const proceedToPayment = async () => {
        setShowLockModal(false);

        try {
            setIsLoading(true);
            const response = await fetch("/api/pay/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    callbackUrl: window.location.href,
                    discountCode: discountCode || undefined
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Something went wrong";
            toast.error(message);
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <h2 className="font-display text-2xl font-bold text-white">Verifying Payment...</h2>
                    <p className="text-gray-400">Please wait while we confirm your transaction.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black p-4">
            <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[150px]" />
            <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[150px]" />

            <div className="glass-panel relative z-10 flex w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-dark/50 p-8 shadow-2xl backdrop-blur-xl md:p-10">
                <div className="mb-6 flex h-20 w-20 self-center items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-glow ring-1 ring-white/10">
                    <Lock className="h-10 w-10 text-white" />
                </div>

                <div className="mb-8 space-y-3 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                        <Sparkles className="h-3 w-3" />
                        Premium Workspace
                    </div>
                    <h1 className="font-display text-3xl font-bold text-white">Unlock Your Project</h1>
                    <p className="leading-relaxed text-gray-400">
                        Access the full workspace, advanced editing tools, and export features by upgrading this project.
                    </p>
                </div>

                <div className="mb-8 rounded-2xl border border-white/5 bg-white/5 p-6">
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                            <span>Full Chapter Editing & Formatting</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                            <span>Unlimited AI Refinements</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                            <span>Export to PDF & Word</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="flex items-baseline justify-center gap-2">
                        {discountCode ? (
                            <span className="text-sm text-gray-500 line-through">
                                ₦{requiredAmount.toLocaleString()}
                            </span>
                        ) : null}
                        <span className="font-display text-4xl font-bold text-white">
                            ₦{finalAmount.toLocaleString()}
                        </span>
                    </div>

                    <div className="w-full max-w-sm">
                        {isReferred ? (
                            <div className="animate-in slide-in-from-bottom-2 fade-in rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-purple-500/20 p-2 text-purple-400">
                                        <HeartHandshake className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-purple-400">Influencer Support Active</div>
                                        <div className="text-xs text-purple-300/60">Discount codes are disabled while supporting a creator.</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <DiscountCodeInput
                                originalAmount={requiredAmount}
                                onValidCode={(code, amount) => {
                                    setDiscountCode(code);
                                    setFinalAmount(requiredAmount - amount);
                                }}
                                onClear={() => {
                                    setDiscountCode(null);
                                    setFinalAmount(requiredAmount);
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleUnlockClick}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Initializing...
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4" />
                                Unlock Now
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Secured by Paystack</span>
                    </div>

                    <Link
                        href="/dashboard"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <p className="mt-8 text-xs text-gray-600">
                Need help? <button onClick={() => openSupport({ page: "workspace-lock", projectId })} className="underline hover:text-gray-400">Contact Support</button>
            </p>

            {showLockModal ? (
                <TopicLockModal
                    isOpen={showLockModal}
                    onClose={() => setShowLockModal(false)}
                    onConfirm={proceedToPayment}
                    topic={projectTopic || "Your Project Topic"}
                    amount={finalAmount}
                    showDiscountInput={false}
                />
            ) : null}
        </div>
    );
}
