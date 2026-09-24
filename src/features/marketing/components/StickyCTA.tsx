'use client';

import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function StickyCTA() {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const handleScroll = () => setIsVisible(window.scrollY > 500);
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return isVisible ? <Link href="/chat" className="fixed bottom-4 right-4 z-40 flex min-h-11 items-center gap-2 rounded-md border border-rule bg-writing px-4 text-sm font-semibold text-ink shadow-sm hover:bg-selection sm:bottom-6 sm:right-6"><MessageSquare size={18} /> Ask a question</Link> : null;
}
