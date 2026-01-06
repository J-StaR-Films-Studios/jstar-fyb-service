
"use client";

import { useState } from "react";
import { Loader2, Upload, AlertCircle, CheckCircle, Clock, CreditCard, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Project, TopicSwitchRequest } from "@prisma/client";
import { useRouter } from "next/navigation";

interface TopicSwitchRequestFormProps {
    project: Project;
    activeRequest?: TopicSwitchRequest | null;
}

export function TopicSwitchRequestForm({ project, activeRequest }: TopicSwitchRequestFormProps) {
    const router = useRouter();
    const [reason, setReason] = useState<"lecturer_rejected" | "changed_mind">("lecturer_rejected");
    const [explanation, setExplanation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [proofFile, setProofFile] = useState<string | null>(null);
    const [isPayingSwitch, setIsPayingSwitch] = useState(false);

    const handlePaySwitch = async () => {
        if (!activeRequest) return;

        setIsPayingSwitch(true);
        try {
            const res = await fetch("/api/pay/switch/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: activeRequest.id })
            });

            const data = await res.json();

            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to initialize payment");
            }
        } catch (error: any) {
            toast.error(error.message || "Payment initialization failed");
        } finally {
            setIsPayingSwitch(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/support/topic-switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.id,
                    reason,
                    explanation,
                    proofUrl: proofFile, // Send Base64 string directly
                    fee: reason === 'changed_mind' ? 2000 : undefined // ₦2,000 fee for changed mind
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit");
            }

            toast.success("Request submitted successfully!");
            setIsSuccess(true);
            router.refresh(); // Refresh to show updated state
        } catch (error) {
            toast.error("Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ACTIVE REQUEST STATES
    if (activeRequest) {
        // Pending Review
        if (activeRequest.status === 'pending') {
            return (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 mb-4">
                        <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Request Under Review</h3>
                    <p className="text-gray-400 text-sm">
                        Your topic switch request is being reviewed by our team. You&apos;ll be notified once a decision is made.
                    </p>
                </div>
            );
        }

        // Approved - Pending Payment
        if (activeRequest.status === 'pending_payment') {
            return (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-4">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Request Approved!</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Your topic switch request has been approved. Complete the payment to finalize your topic change.
                    </p>
                    <button
                        onClick={handlePaySwitch}
                        disabled={isPayingSwitch}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        {isPayingSwitch ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CreditCard className="w-4 h-4" />
                        )}
                        Pay ₦{(activeRequest.fee || 2000).toLocaleString()} to Switch Topic
                    </button>
                </div>
            );
        }

        // Denied
        if (activeRequest.status === 'denied') {
            return (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-500 mb-4">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Request Denied</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Unfortunately, your topic switch request was not approved. You may submit a new request with additional information.
                    </p>
                    <button
                        onClick={() => router.refresh()}
                        className="text-primary underline text-sm hover:text-white transition-colors"
                    >
                        Submit New Request
                    </button>
                </div>
            );
        }
    }

    if (isSuccess) {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-4">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Request Submitted</h3>
                <p className="text-gray-400 text-sm">
                    We&apos;ve received your request. Our support team will review it shortly.
                    {reason === 'lecturer_rejected'
                        ? ' You will be notified once approved.'
                        : ' Once approved, you\'ll receive a payment link to complete your topic switch.'}
                </p>
            </div>
        );
    }

    if (!project.isLocked) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-gray-400">Your project is not locked. You can edit the topic freely in the builder.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">Request Topic Switch</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Reason for Switch</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setReason("lecturer_rejected")}
                            className={`p-4 rounded-lg border text-left transition-all ${reason === "lecturer_rejected"
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"
                                }`}
                        >
                            <div className="font-bold mb-1">Supervisor Rejected</div>
                            <div className="text-xs opacity-80">Free switch with proof</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setReason("changed_mind")}
                            className={`p-4 rounded-lg border text-left transition-all ${reason === "changed_mind"
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"
                                }`}
                        >
                            <div className="font-bold mb-1">Changed My Mind</div>
                            <div className="text-xs opacity-80">Fee: ₦2,000</div>
                        </button>
                    </div>
                </div>

                {reason === "lecturer_rejected" && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Proof of Rejection (Screenshot)</label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-white/20 transition-colors bg-black/20 group relative cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    if (file.size > 2 * 1024 * 1024) { // 2MB limit
                                        toast.error("File details must be less than 2MB");
                                        return;
                                    }

                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        setProofFile(ev.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }}
                            />
                            {proofFile ? (
                                <div className="relative z-10">
                                    <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                    </div>
                                    <p className="text-green-400 text-xs font-bold">Image Selected</p>
                                    <p className="text-gray-500 text-[10px]">Click to change</p>
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2 group-hover:text-primary transition-colors" />
                                    <p className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                        Click to upload screenshot (Max 2MB)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Explanation</label>
                    <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder={reason === 'lecturer_rejected' ? "Describe why it was rejected..." : "Why do you want to switch?"}
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary min-h-[100px]"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {reason === 'changed_mind' ? 'Proceed to Payment (₦2,000)' : 'Submit Request'}
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">
                        {reason === 'changed_mind'
                            ? "You will be redirected to Paystack."
                            : "Requests are usually reviewed within 24 hours."}
                    </p>
                </div>
            </form>
        </div>
    );
}
