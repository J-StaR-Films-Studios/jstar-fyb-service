"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";

export function ProofModal({ proofUrl }: { proofUrl: string }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!proofUrl) return <span className="opacity-50">No proof</span>;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-xs font-bold uppercase tracking-wider"
            >
                <Eye className="h-3 w-3" />
                View Proof
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative bg-[#0f0c29] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white">Proof of Rejection</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={proofUrl}
                                alt="Proof Evidence"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                            <p className="text-xs text-gray-500">
                                This image is stored securely. Right click to save if needed.
                            </p>
                        </div>
                    </div>

                    {/* Backdrop Close Click */}
                    <div
                        className="absolute inset-0 -z-10"
                        onClick={() => setIsOpen(false)}
                    />
                </div>
            )}
        </>
    );
}
