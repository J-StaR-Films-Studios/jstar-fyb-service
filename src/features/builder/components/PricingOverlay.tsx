import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingOverlayProps {
    onUnlock: () => void;
}

export function PricingOverlay({ onUnlock }: PricingOverlayProps) {
    return (
        <div className="flex flex-col items-center justify-center text-center px-4 w-full max-w-md mx-auto">
            <Lock className="w-10 h-10 text-transparent mb-6" style={{ stroke: '#a855f7', strokeWidth: 1.5 }} />

            <h2 className="text-2xl font-bold text-white mb-3">
                Unlock Full Project
            </h2>

            <p className="text-gray-300 mb-8 max-w-sm mx-auto">
                Get the complete 5-chapter source code, documentation, and implementation guide.
            </p>

            <button
                onClick={onUnlock}
                className={cn(
                    "w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold py-4 px-8 rounded-xl",
                    "transition-all uppercase tracking-wide text-sm shadow-md"
                )}
            >
                PAY ₦15,000 TO UNLOCK
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Secured by Paystack</span>
            </div>
        </div>
    );
}
