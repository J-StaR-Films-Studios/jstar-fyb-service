'use client';

import Link from 'next/link';
import { useSupport } from '@/features/support/context/SupportContext';

export function Footer() {
    const { openSupport } = useSupport();
    return <footer className="border-t border-rule bg-writing py-14 pb-24 sm:pb-14">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <h2 className="text-2xl font-bold text-ink md:text-3xl">Ready to start your project?</h2>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/register" className="inline-flex min-h-11 items-center justify-center rounded-md bg-rust px-6 font-semibold text-writing hover:bg-[#953D2C]">Get started</Link>
                <Link href="/project/consult" className="inline-flex min-h-11 items-center justify-center rounded-md border border-rule px-6 font-semibold text-ink hover:bg-selection">Explore agency help</Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-rule pt-6 text-sm text-ink-muted">
                <span className="font-bold text-ink">J-Star Projects</span>
                <button type="button" onClick={() => openSupport()} className="min-h-11 text-rust hover:underline">Contact support</button>
                <a href="mailto:hey@jstarstudios.com" className="text-rust">hey@jstarstudios.com</a>
                <span>J StaR Films Studios © 2026. All rights reserved.</span>
            </div>
        </div>
    </footer>;
}
