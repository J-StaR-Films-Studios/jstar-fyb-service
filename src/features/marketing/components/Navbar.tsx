'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { Menu, X } from 'lucide-react';

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const session = useSession();
    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navLinks = [
        { href: '/#experience', label: 'Experience' },
        { href: '/#pricing', label: 'Pricing' },
        { href: '/project/consult', label: 'Agency' },
        { href: '/#showcase', label: 'Showcase' },
    ];

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-rule bg-paper/95">
            <nav aria-label="Main navigation" className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 md:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-1.5 font-margin text-sm font-bold text-ink sm:gap-3 sm:text-lg">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-writing sm:h-10 sm:w-10" aria-hidden="true">J.</span> J-Star Projects
                </Link>
                <div className="hidden items-center gap-6 md:flex">
                    {navLinks.map(link => <Link key={link.href} href={link.href} className="text-sm font-medium text-ink-muted hover:text-rust">{link.label}</Link>)}
                    <Link href={session?.data ? '/dashboard' : '/auth/login'} className="text-sm font-semibold text-ink">{session?.data ? 'Dashboard' : 'Sign in'}</Link>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <Link href="/project/builder" className="inline-flex min-h-11 items-center rounded-md bg-rust px-2 text-sm font-semibold text-writing hover:bg-[#953D2C] sm:px-4"><span className="sm:hidden">Start</span><span className="hidden sm:inline">Start project</span></Link>
                    <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-11 w-11 items-center justify-center rounded-md border border-rule md:hidden" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>{mobileMenuOpen ? <X /> : <Menu />}</button>
                </div>
            </nav>
            {mobileMenuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-rule bg-paper px-5 py-4 md:hidden">
                <div className="mx-auto flex max-w-[1200px] flex-col">
                    {navLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center font-medium text-ink">{link.label}</Link>)}
                    <Link href={session?.data ? '/dashboard' : '/auth/login'} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center font-semibold text-rust">{session?.data ? 'Dashboard' : 'Sign in'}</Link>
                </div>
            </nav>}
        </header>
    );
}
