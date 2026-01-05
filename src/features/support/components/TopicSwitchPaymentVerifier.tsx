"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function TopicSwitchPaymentVerifier() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const reference = searchParams.get("reference");
    const isPaymentVerifying = searchParams.get("payment") === "verifying";

    useEffect(() => {
        if (reference && reference.startsWith("switch_") && isPaymentVerifying && !isVerifying && !isSuccess) {
            verifyPayment(reference);
        }
    }, [reference, isPaymentVerifying]);

    const verifyPayment = async (ref: string) => {
        try {
            setIsVerifying(true);

            const response = await fetch("/api/pay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference: ref }),
            });

            const data = await response.json();

            if (data.success) {
                setIsSuccess(true);
                toast.success("Payment verified! Your topic switch is complete.");

                // Clear URL params and refresh to show updated state
                setTimeout(() => {
                    router.push("/profile");
                    router.refresh();
                }, 1500);
            } else {
                throw new Error(data.error || "Verification failed");
            }
        } catch (error: any) {
            toast.error(error.message || "Payment verification failed");
            setIsVerifying(false);
        }
    };

    // Show verification UI only when actively verifying
    if (isVerifying || isSuccess) {
        return (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
                    {isSuccess ? (
                        <CheckCircle className="w-6 h-6" />
                    ) : (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                    {isSuccess ? "Payment Verified!" : "Verifying Payment..."}
                </h3>
                <p className="text-gray-400 text-sm">
                    {isSuccess
                        ? "Your topic switch is complete. Redirecting..."
                        : "Please wait while we confirm your payment."}
                </p>
            </div>
        );
    }

    return null;
}
