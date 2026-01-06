'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Personality Data
const PERSONALITIES = [
    {
        name: 'Jay',
        role: 'Phase 1: Discovery',
        image: '/images/jay-portrait.png',
        status: 'Jay is Active',
        bio: 'The architect of your journey. Jay uses high-velocity intelligence to scout the landscape of your field and identify the "killer topic" that sets you apart. He\'s energetic, direct, and speaks the language of a winner.',
        quote: "Yo! I'm Jay, your FYP plug. Tell me what you're passionate about and let's find you a topic that'll make your supervisor smile. No dull stuff, I promise!",
    },
    {
        name: 'Monji',
        role: 'Phase 2: Deep Work',
        image: '/images/ai-crew/monji.png',
        status: 'Monji is Active',
        bio: 'The brilliant mind overseeing your research. With a background in Mass Communications and a pedigree for academic excellence, Monji ensures your project isn\'t just generated—it\'s crafted with precision, style, and impeccable logic.',
        quote: "Hi love! I'm Monji, your research partner. I've read through all your uploaded papers and I'm here to help you write with precision and style. What section are we working on today?",
    },
    {
        name: 'Nengi',
        role: 'Universal: Brain Dump',
        image: '/images/ai-crew/nengi.png',
        status: 'Nengi is Active',
        bio: 'The creative eye. Nengi is your 24/7 thought partner, ready to capture random ideas, visualize complex data, or just listen when you need to vent about the process. Relaxed, observant, and always focused on the big picture.',
        quote: "What's good? I'm Nengi. Unlike Jay and Monji who have specific jobs, I'm just here to chat. Got a random question? Need to brain dump? I got you.",
    },
];

export function MorphingVariant() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-cycle every 4 seconds
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % PERSONALITIES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isPaused]);

    const active = PERSONALITIES[activeIndex];

    return (
        <div className="min-h-screen bg-dark text-white pt-24 pb-32">
            <div className="container mx-auto px-6 max-w-6xl">
                {/* Header */}
                <header className="text-center mb-16">
                    <span className="text-primary font-bold uppercase tracking-[4px] text-xs mb-4 block">
                        The J Star Collective
                    </span>
                    <h1 className="text-4xl md:text-6xl font-display font-black leading-tight">
                        Meet the <span className="text-gradient">Intelligence</span> Behind Your Success.
                    </h1>
                </header>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Image Frame */}
                    <div
                        className="relative aspect-square rounded-[2rem] overflow-hidden glass-panel border-white/10 cursor-pointer group"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={active.image}
                                    alt={active.name}
                                    fill
                                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                />
                            </motion.div>
                        </AnimatePresence>

                        {/* Status Pill */}
                        <div className="absolute top-6 right-6 px-5 py-3 bg-dark/80 backdrop-blur-xl rounded-2xl border border-primary/30 flex items-center gap-3 z-10">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                            <span className="text-sm font-semibold">{active.status}</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <span className="text-primary text-xs font-bold uppercase tracking-[3px] mb-3 block">
                                    {active.role}
                                </span>
                                <h2 className="text-5xl font-display font-black mb-6">{active.name}</h2>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">{active.bio}</p>
                                <div className="glass-panel p-6 rounded-2xl border-white/5 relative">
                                    <span className="absolute -top-3 left-5 text-6xl text-primary/20 font-serif">"</span>
                                    <p className="text-gray-300 italic">{active.quote}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Progress Dots */}
                        <div className="flex gap-3 mt-8">
                            {PERSONALITIES.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveIndex(i)}
                                    className={`h-1 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-12 bg-primary' : 'w-8 bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* CTA */}
                        <Link
                            href="/chat"
                            className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-white text-dark font-bold uppercase tracking-wide rounded-full hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_40px_rgba(139,92,246,0.3)]"
                        >
                            Start Your Consult
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Trust Section */}
                <div className="mt-24 glass-panel p-12 rounded-[2rem] text-center border-white/5">
                    <div className="flex justify-center gap-2 text-accent mb-6">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-6 h-6 fill-current" />
                        ))}
                    </div>
                    <blockquote className="text-2xl font-display italic mb-8 text-gray-300">
                        "The J Star team didn't just build my software; they taught me how it works. I walked into my defense with 100% confidence. Got an A."
                    </blockquote>
                    <p className="text-sm font-mono uppercase tracking-widest text-gray-500">
                        — Daniel A., UNILAG Computer Science '24
                    </p>
                </div>
            </div>
        </div>
    );
}
