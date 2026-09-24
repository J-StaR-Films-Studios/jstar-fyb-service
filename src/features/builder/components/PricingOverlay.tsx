import { Lock, ShieldCheck } from "lucide-react";

interface PricingOverlayProps {
    onUnlock: () => void;
}

export function PricingOverlay({ onUnlock }: PricingOverlayProps) {
    return (
        <div className="flex flex-col items-center justify-center text-center px-4 w-full max-w-md mx-auto">
            <Lock className="w-10 h-10 text-ink mb-6" />

            <h2 className="text-2xl font-bold text-ink mb-3">
                Unlock Full Project
            </h2>

            <p className="text-ink-muted mb-8 max-w-sm mx-auto">
                Unlock your project workspace to use the writing tools.
            </p>

            <button
                onClick={onUnlock}
                className="w-full min-h-11 bg-rust hover:bg-rust/90 text-writing font-bold py-3 px-8 rounded-md transition-colors text-sm"
            >
                Continue to unlock
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-ink-muted text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Secured by Paystack</span>
            </div>
        </div>
    );
}
