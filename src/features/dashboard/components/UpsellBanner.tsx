import React from "react";
import Link from "next/link";

export const UpsellBanner = () => {
    return (
        <div className="p-6 rounded-md bg-selection border border-rule text-ink relative overflow-hidden text-center mt-8">
            <div className="relative z-10">
                <h3 className="text-xl font-bold font-margin mb-2">Need a Human Touch?</h3>
                <p className="text-ink-muted text-sm mb-4">
                    Our agency experts can review your code or write your defense speech.
                </p>
                <Link
                    href="/services"
                    className="inline-block px-6 py-3 bg-writing text-ink border border-rule font-bold rounded-md text-sm hover:bg-paper transition-colors min-h-11"
                >
                    Hire an Expert
                </Link>
            </div>
        </div>
    );
};
