'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { Menu, X } from 'lucide-react';


export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const session = useSession();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change or resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileMenuOpen(false);
            }
        };
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
        <>
            <nav
                className={cn(
                    "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
                    scrolled ? "bg-dark/80 backdrop-blur-md border-white/5 py-4" : "bg-transparent py-6"
                )}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="text-lg md:text-2xl font-display font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">
                        J Star<span className="text-primary">.FYB</span>
                    </Link>

                    <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="hover:text-primary transition-colors text-white/80">
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sign In - Desktop Only */}
                        {!session?.data && (
                            <Link
                                href="/auth/login"
                                className="hidden md:block text-sm font-bold uppercase tracking-wider text-white hover:text-primary transition-colors"
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Dashboard - Desktop Only (Logged In) */}
                        {session?.data && (
                            <Link
                                href="/dashboard"
                                className="hidden md:block text-sm font-bold uppercase tracking-wider text-white hover:text-primary transition-colors"
                            >
                                Dashboard
                            </Link>
                        )}

                        <Link
                            href="/project/builder"
                            className="px-4 py-2 md:px-6 md:py-2 bg-white/5 border border-white/10 rounded-full hover:bg-primary hover:border-primary transition-all duration-300 font-bold text-xs uppercase tracking-wider text-white"
                        >
                            <span className="md:hidden">Start</span>
                            <span className="hidden md:inline">Start Project</span>
                        </Link>

                        {/* Hamburger Menu - Mobile Only */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 -mr-2 text-white hover:text-primary transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-dark/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <span className="font-display font-bold text-xl tracking-widest text-primary uppercase">Menu</span>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            aria-label="Close menu"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Nav Links */}
                    <div className="flex-1 flex flex-col gap-6 p-8 text-3xl font-light font-display">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="hover:text-primary transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="h-px bg-white/10 my-4 w-12" />

                        {session?.data ? (
                            <Link
                                href="/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-xl font-bold text-white hover:text-primary transition-colors flex items-center gap-2"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                href="/auth/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-xl font-bold text-white hover:text-primary transition-colors flex items-center gap-2"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Footer CTA */}
                    <div className="p-6 border-t border-white/10">
                        <Link
                            href="/project/builder"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold uppercase tracking-widest text-center shadow-lg shadow-primary/25 transition-all"
                        >
                            Start Project
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
