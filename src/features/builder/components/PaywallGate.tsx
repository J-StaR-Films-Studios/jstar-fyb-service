'use client';

import { Loader2 } from 'lucide-react';
import { PricingOverlay } from './PricingOverlay';
import { ReactNode } from 'react';

interface PaywallGateProps {
    children: ReactNode;
    isPaid: boolean;
    isVerifying?: boolean;
    onUnlock: () => void;
}

/**
 * Wraps content with a paywall overlay when unpaid.
 * Shows blur effect on content with lock icon and pricing CTA.
 */
export function PaywallGate({
    children,
    isPaid,
    isVerifying = false,
    onUnlock
}: PaywallGateProps) {
    // Verifying payment - show loader
    if (isVerifying) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <Loader2 className="w-12 h-12 text-rust animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-ink mb-2">Verifying Payment...</h2>
                <p className="text-ink-muted">Please wait while we confirm your transaction.</p>
            </div>
        );
    }

    // Paid - just render children
    if (isPaid) {
        return <>{children}</>;
    }

    // Not paid - show paywall
    return (
        <div className="relative">
            {/* Content is visible but blurred */}
            <div className="blur-content">
                {children}
            </div>

            {/* Paywall overlay with gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-paper/60 to-paper flex flex-col items-center justify-end pb-10 z-10">
                <PricingOverlay onUnlock={onUnlock} />
            </div>
        </div>
    );
}
