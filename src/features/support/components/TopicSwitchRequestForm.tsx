
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
                <div className="bg-writing border border-rule rounded-md p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-selection text-ink mb-4">
                        <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Request under review</h3>
                    <p className="text-ink-muted text-sm">
                        Your topic switch request is being reviewed by our team. You&apos;ll be notified once a decision is made.
                    </p>
                </div>
            );
        }

        // Approved - Pending Payment
        if (activeRequest.status === 'pending_payment') {
            return (
                <div className="bg-writing border border-rule rounded-md p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-selection text-ink mb-4">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Request approved</h3>
                    <p className="text-ink-muted text-sm mb-6">
                        Your topic switch request has been approved. Complete the payment to finalize your topic change.
                    </p>
                    <button
                        onClick={handlePaySwitch}
                        disabled={isPayingSwitch}
                        className="w-full min-h-11 bg-rust hover:bg-rust/90 disabled:opacity-60 text-writing font-bold py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-colors"
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
                <div className="bg-writing border border-rule rounded-md p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-selection text-ink mb-4">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Request denied</h3>
                    <p className="text-ink-muted text-sm mb-4">
                        Unfortunately, your topic switch request was not approved. You may submit a new request with additional information.
                    </p>
                    <button
                        onClick={() => router.refresh()}
                        className="text-rust underline text-sm hover:text-ink transition-colors"
                    >
                        Submit New Request
                    </button>
                </div>
            );
        }
    }

    if (isSuccess) {
        return (
            <div className="bg-writing border border-rule rounded-md p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-selection text-ink mb-4">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">Request submitted</h3>
                <p className="text-ink-muted text-sm">
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
            <div className="bg-writing border border-rule rounded-md p-6 text-center">
                <p className="text-ink-muted">Your project is not locked. You can edit the topic freely in the builder.</p>
            </div>
        );
    }

    return (
        <div className="bg-writing border border-rule rounded-md p-6">
            <h3 className="text-lg font-bold text-ink mb-6">Request topic switch</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Reason for switch</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setReason("lecturer_rejected")}
                            className={`p-4 rounded-md border text-left transition-colors ${reason === "lecturer_rejected"
                                ? "bg-selection border-rust text-ink"
                                : "bg-writing border-rule text-ink-muted hover:bg-selection"
                                }`}
                        >
                            <div className="font-bold mb-1">Supervisor rejected</div>
                            <div className="text-xs">Free switch with proof</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setReason("changed_mind")}
                            className={`p-4 rounded-md border text-left transition-colors ${reason === "changed_mind"
                                ? "bg-selection border-rust text-ink"
                                : "bg-writing border-rule text-ink-muted hover:bg-selection"
                                }`}
                        >
                            <div className="font-bold mb-1">Changed my mind</div>
                            <div className="text-xs">Fee: ₦2,000</div>
                        </button>
                    </div>
                </div>

                {reason === "lecturer_rejected" && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-ink">Proof of rejection (screenshot)</label>
                        <div className="border-2 border-dashed border-rule rounded-md p-6 text-center hover:border-rust transition-colors bg-paper group relative cursor-pointer">
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
                                    <p className="text-ink text-xs font-bold">Image selected</p>
                                    <p className="text-ink-muted text-xs">Click to change</p>
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <Upload className="w-8 h-8 text-ink-muted mx-auto mb-2 group-hover:text-rust transition-colors" />
                                    <p className="text-xs text-ink-muted group-hover:text-ink transition-colors">
                                        Click to upload screenshot (Max 2MB)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Explanation</label>
                    <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder={reason === 'lecturer_rejected' ? "Describe why it was rejected..." : "Why do you want to switch?"}
                        required
                        className="w-full bg-writing border border-rule rounded-md p-3 text-ink focus:outline-none focus:border-rust min-h-[100px]"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full min-h-11 bg-rust hover:bg-rust/90 disabled:opacity-60 text-writing font-bold py-3 rounded-md flex items-center justify-center gap-2 transition-colors"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {reason === 'changed_mind' ? 'Proceed to Payment (₦2,000)' : 'Submit Request'}
                    </button>
                    <p className="text-xs text-center text-ink-muted mt-3">
                        {reason === 'changed_mind'
                            ? "You will be redirected to Paystack."
                            : "Requests are usually reviewed within 24 hours."}
                    </p>
                </div>
            </form>
        </div>
    );
}
