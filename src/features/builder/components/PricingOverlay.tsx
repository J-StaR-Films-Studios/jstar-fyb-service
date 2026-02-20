import { Lock, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingOverlayProps {
    onUnlock: () => void;
}

export function PricingOverlay({ onUnlock }: PricingOverlayProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-dark/30 backdrop-blur-xl p-6 md:p-8 animate-in fade-in duration-500">
            {/* Background Gradient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

            {/* Ambient Background Blobs */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/20 blur-[120px] rounded-full" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/15 blur-[120px] rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Lock Icon in Circle with Purple Glow */}
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                    <Lock className="w-8 h-8 text-primary" />
                </div>

                {/* Unlock Required Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3 h-3" />
                    Unlock Required
                </div>

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                    Generate Full Content
                </h2>

                {/* Description */}
                <p className="text-gray-400 max-w-lg mx-auto mb-8 text-lg">
                    Unlock the AI Chapter Generator to draft your entire 15,000-word project in minutes. Includes citations, formatting, and unlimited edits.
                </p>

                {/* Price Display */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <span className="text-2xl font-bold text-gray-500 line-through decoration-red-500/50">
                        ₦15,000
                    </span>
                    <span className="text-4xl font-display font-bold text-white">
                        ₦5,000
                    </span>
                </div>

                {/* Unlock Now CTA Button */}
                <button
                    onClick={onUnlock}
                    className={cn(
                        "px-8 py-4 bg-gradient-to-r from-primary to-accent rounded-xl",
                        "font-bold font-display uppercase tracking-wide text-sm",
                        "shadow-xl shadow-primary/20 hover:shadow-primary/40",
                        "hover:scale-105 transition-all w-full md:w-auto min-w-[200px]",
                        "flex items-center justify-center gap-2"
                    )}
                >
                    <Lock className="w-4 h-4" />
                    Unlock Now
                </button>

                {/* Trust Indicators */}
                <p className="mt-4 text-xs text-gray-500">
                    Secure payment via Paystack • 100% Money-back guarantee
                </p>
            </div>
        </div>
    );
}
