
"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RequestRowActions({ requestId, currentStatus }: { requestId: string, currentStatus: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (currentStatus !== 'pending') return null;

    const handleReview = async (status: 'approved' | 'denied') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/requests/${requestId}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success(`Request ${status}`);
            router.refresh();
        } catch (error) {
            toast.error("Operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => handleReview('approved')}
                disabled={loading}
                className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                title="Approve"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
                onClick={() => handleReview('denied')}
                disabled={loading}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Deny"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
        </div>
    );
}
