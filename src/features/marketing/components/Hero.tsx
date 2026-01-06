'use client';

import { motion } from 'framer-motion';
import { Code, Cpu, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { MarketingTimer } from './MarketingTimer';

interface HeroProps {
    startDate: Date | null;
    targetDate: Date | null;
}

export function Hero({ startDate, targetDate }: HeroProps) {
    const session = useSession();

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-dark to-dark opacity-40 pointer-events-none"></div>

            {/* Optimized: Removed heavy scale/opacity Framer Motion loops. Using CSS directly or static. */}
            <div className="absolute top-20 right-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px] animate-pulse opacity-50" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse opacity-30" style={{ animationDelay: '1s' }} />

            <div className="container mx-auto px-6 relative z-10 text-center">
                {/* Floating Icons - Optimized with will-change-transform */}
                <motion.div
                    animate={{ y: [-15, 15, -15], rotate: [0, 5, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 left-10 w-24 h-24 glass-panel rounded-2xl flex items-center justify-center border-l-4 border-l-accent opacity-60 hidden md:flex will-change-transform"
                >
                    <Code className="w-10 h-10 text-accent" />
                </motion.div>

                <motion.div
                    animate={{ y: [15, -15, 15], rotate: [0, -5, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-40 right-10 w-32 h-32 glass-panel rounded-full flex items-center justify-center border-r-4 border-r-primary opacity-60 hidden md:flex will-change-transform"
                >
                    <Cpu className="w-12 h-12 text-primary" />
                </motion.div>

                {/* Status Chip */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 10 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
                >
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-mono uppercase tracking-wider text-gray-300">Accepting New Projects</span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.2 }}
                    className="text-4xl md:text-6xl lg:text-8xl font-display font-bold leading-tight mb-6 md:mb-8"
                >
                    Don&apos;t Just Pass.<br />
                    <span className="text-gradient">Dominate.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.4 }}
                    className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-8 font-light leading-relaxed"
                >
                    The ultimate cheat code for your final year project.
                    Full documentation, code foundations, and agency-grade execution.
                </motion.p>

                {/* Timer Section */}
                {startDate && targetDate && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.6 }}
                        className="mb-8 md:mb-12"
                    >
                        <p className="text-primary/80 font-mono text-xs uppercase tracking-widest mb-2">Limited Time Offer</p>
                        <MarketingTimer startDate={startDate} targetDate={targetDate} />
                    </motion.div>
                )}

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.8 }}
                    className="flex flex-col md:flex-row gap-6 justify-center items-center"
                >
                    <Link
                        href={session?.data ? "/dashboard" : "/auth/register"}
                        className="px-10 py-5 bg-primary rounded-xl font-display font-bold tracking-wide uppercase hover:scale-105 transition-transform duration-300 glow-box w-full md:w-auto text-white flex items-center justify-center"
                    >
                        {session?.data ? "Go to Dashboard" : "Get Started Now"}
                    </Link>
                    <Link
                        href="#showcase"
                        className="px-10 py-5 glass-panel rounded-xl font-display font-bold tracking-wide uppercase hover:bg-white/10 transition-colors w-full md:w-auto border border-white/10 flex items-center justify-center text-white"
                    >
                        See Examples
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-8 text-sm text-gray-500 font-medium"
                >
                    Looking for the <Link href="/project/consult" className="text-primary hover:underline underline-offset-4">Full Agency Service?</Link>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-0 w-full flex justify-center z-10 pointer-events-none">
                <motion.div
                    animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex flex-col items-center gap-2 text-white/50"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </div>
        </section>
    );
}
