"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, CreditCard, ChevronDown } from "lucide-react";
import { toast } from 'sonner';
import { PRICING_CONFIG } from '@/config/pricing';

interface SendPaymentLinkButtonProps {
    leadId?: string;
    projectId?: string;
    totalPaid?: number; // Logic: We subtract this from the Tier Price
}

// Flattening tiers for Admin Selection
const PRICING_TIERS = {
    // SaaS
    DIY_PAPER: PRICING_CONFIG.SAAS.PAPER,
    DIY_SOFTWARE: PRICING_CONFIG.SAAS.SOFTWARE,

    // Agency Paper
    AGENCY_PAPER_EXPRESS: PRICING_CONFIG.AGENCY.PAPER[0],
    AGENCY_PAPER_DEFENSE: PRICING_CONFIG.AGENCY.PAPER[1],
    AGENCY_PAPER_PREMIUM: PRICING_CONFIG.AGENCY.PAPER[2],

    // Agency Software
    AGENCY_CODE_GO: PRICING_CONFIG.AGENCY.SOFTWARE[0],
    AGENCY_DEFENSE_READY: PRICING_CONFIG.AGENCY.SOFTWARE[1],
    AGENCY_SOFT_LIFE: PRICING_CONFIG.AGENCY.SOFTWARE[2],
};

export function SendPaymentLinkButton({ leadId, projectId, totalPaid = 0 }: SendPaymentLinkButtonProps) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate dropdown position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const DROP_WIDTH = 256; // w-64
            const PADDING = 16;

            // Default: Align right edges
            let left = rect.right - DROP_WIDTH;

            // Screen boundary check
            const maxLeft = window.innerWidth - DROP_WIDTH - PADDING;

            // specific adjustment for very small screens or weird positioning
            if (left > maxLeft) left = maxLeft;
            if (left < PADDING) left = PADDING;

            setDropdownPosition({
                top: rect.bottom + 8,
                left: left,
            });
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close on scroll (since it's fixed position)
    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => setIsOpen(false);
            window.addEventListener("scroll", handleScroll, true);
            return () => window.removeEventListener("scroll", handleScroll, true);
        }
    }, [isOpen]);

    const handleGenerateLink = async (key: keyof typeof PRICING_TIERS) => {
        if (!leadId && !projectId) {
            toast.error("No Lead or Project ID provided");
            return;
        }

        setLoading(true);
        setIsOpen(false);
        const tier = PRICING_TIERS[key];

        // PRORATION LOGIC
        // If sending for a PROJECT (which might have past payments), subtract totalPaid.
        // Lead links are typically for fresh/new users, so we default to full price unless logic changes.
        const basePrice = tier.price;
        const proratedPrice = Math.max(0, basePrice - totalPaid);

        const endpoint = projectId
            ? `/api/admin/projects/${projectId}/send-payment-link`
            : `/api/admin/leads/${leadId}/send-payment-link`;

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: proratedPrice,
                    tier: tier.label,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to generate link");

            // Success - Copy to clipboard
            await navigator.clipboard.writeText(data.authorizationUrl);

            if (proratedPrice < basePrice) {
                toast.success(`Upgrade Link (₦${proratedPrice.toLocaleString()}) copied!`);
            } else {
                toast.success(`Payment Link (₦${basePrice.toLocaleString()}) copied!`);
            }

        } catch (error) {
            toast.error("Error generating link");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/5 border border-primary/20 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <CreditCard className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                    {projectId ? "Send Upgrade Link" : "Send Pay Link"}
                </span>
                <ChevronDown className="h-3 w-3" />
            </button>

            {/* Portal-like fixed dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="fixed w-64 bg-[#0f0c29] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {totalPaid > 0 && (
                        <div className="px-4 py-2 bg-green-500/10 text-green-400 text-xs font-bold border-b border-white/5">
                            Paid So Far: ₦{totalPaid.toLocaleString()}
                        </div>
                    )}

                    {Object.entries(PRICING_TIERS).map(([key, tier]) => {
                        const due = Math.max(0, tier.price - totalPaid);
                        const isFullyPaid = due === 0;

                        return (
                            <button
                                key={key}
                                onClick={() => !isFullyPaid && handleGenerateLink(key as keyof typeof PRICING_TIERS)}
                                disabled={isFullyPaid}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 transition-colors
                                    ${isFullyPaid ? 'opacity-50 cursor-not-allowed bg-white/5' : 'hover:bg-primary/20'}
                                `}
                            >
                                <div className="font-medium text-white flex justify-between">
                                    <span>{tier.label}</span>
                                    {isFullyPaid && <span className="text-green-500 text-[10px] self-center">PAID</span>}
                                </div>
                                <div className="flex justify-between items-center text-xs mt-1">
                                    <span className="text-gray-400">Due:</span>
                                    <span className={isFullyPaid ? 'text-green-400 font-bold' : 'text-white font-bold'}>
                                        ₦{due.toLocaleString()}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}

