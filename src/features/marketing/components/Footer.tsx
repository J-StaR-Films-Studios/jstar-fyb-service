'use client';

import Link from 'next/link';
import { useSupport } from '@/features/support/context/SupportContext';

export function Footer() {
    const { openSupport } = useSupport();

    return (
        <footer className="border-t border-white/5 bg-black py-20">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl font-display font-bold mb-8">Ready to graduate in style?</h2>
                <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-12">
                    <Link
                        href="/auth/register"
                        className="px-8 py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-wider hover:scale-105 transition-transform"
                    >
                        Get Started Now
                    </Link>
                    <Link
                        href="/project/consult"
                        className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold uppercase tracking-wider hover:bg-white/10 transition-colors text-white"
                    >
                        Full Agency Service
                    </Link>
                </div>
                <div className="flex justify-center gap-6 mb-8">
                    <button
                        onClick={() => openSupport()}
                        className="text-gray-500 hover:text-white transition-colors text-sm"
                    >
                        Contact Support
                    </button>
                </div>
                <p className="text-gray-500">J Star FYB Service © 2026. All rights reserved.</p>
            </div>
        </footer>
    );
}

