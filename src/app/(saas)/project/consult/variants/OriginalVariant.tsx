'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star, Code2, Layers, MessageSquare, Crown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const BENEFITS = [
    {
        icon: <Code2 className="w-6 h-6" />,
        title: "Bespoke Implementation",
        description: "Zero boilerplate. We build your system from scratch with production-grade code that scales."
    },
    {
        icon: <Layers className="w-6 h-6" />,
        title: "Dossier-Grade Documentation",
        description: "5 chapters of academic precision. Formatted, cited, and ready for your department's scrutiny."
    },
    {
        icon: <MessageSquare className="w-6 h-6" />,
        title: "Defense Coaching",
        description: "Private sessions with J Star engineers to ensure you know every line and logic flow."
    }
];

export function OriginalVariant() {
    return (
        <div className="min-h-screen bg-dark text-white pt-24 pb-32">
            <div className="container mx-auto px-6 max-w-5xl">
                {/* Hero section */}
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
                    >
                        <Crown className="w-4 h-4 text-primary" />
                        <span className="text-xs font-mono uppercase tracking-widest text-primary">Priority Agency Access</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-display font-bold leading-tight mb-8"
                    >
                        Elevate Your Project to <span className="text-gradient">Distinction.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto mb-12"
                    >
                        The Full Agency Service is for students who don't just want to pass—they want to lead.
                        Let our expert architects handle every detail of your technical and academic delivery.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col md:flex-row gap-6 justify-center items-center"
                    >
                        <Link
                            href="/chat"
                            className="px-10 py-5 bg-primary rounded-xl font-display font-bold tracking-wide uppercase hover:scale-105 transition-transform duration-300 glow-box w-full md:w-auto text-white flex items-center justify-center gap-3"
                        >
                            Start Free Consultation
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/#pricing"
                            className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
                        >
                            Explore DIY Instead
                        </Link>
                    </motion.div>
                </div>

                {/* Meet the Architect Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        <div className="aspect-square rounded-3xl overflow-hidden glass-panel border-white/10 relative group">
                            <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent opacity-60" />
                            <div className="absolute bottom-8 left-8 right-8 z-10">
                                <h3 className="text-2xl font-display font-bold mb-1">Jay</h3>
                                <p className="text-primary font-mono text-sm uppercase tracking-wider">Lead Project Architect</p>
                            </div>
                            <Image
                                src="/images/jay-portrait.png"
                                alt="Jay - Lead Project Architect"
                                fill
                                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                            />
                        </div>
                        {/* Status badge */}
                        <div className="absolute -top-4 -right-4 px-6 py-4 glass-panel rounded-2xl flex items-center gap-3 border-primary/30">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-bold tracking-tight">Consultant Online</span>
                        </div>
                    </motion.div>

                    <div>
                        <h2 className="text-3xl font-display font-bold mb-6">Expertise is Non-Negotiable.</h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Every J Star project is overseen by Jay, our AI-Integrated architect.
                            We don't just "do projects"—we engineer solutions that withstand the most rigorous defense committees.
                        </p>

                        <div className="space-y-6">
                            {BENEFITS.map((benefit, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex gap-4"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5">
                                        {benefit.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-1 text-lg">{benefit.title}</h4>
                                        <p className="text-gray-500 text-sm leading-relaxed">{benefit.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust Section */}
                <div className="glass-panel p-12 rounded-[2rem] text-center border-white/5 bg-white/[0.02]">
                    <div className="flex justify-center gap-2 text-accent mb-6">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-current" />)}
                    </div>
                    <blockquote className="text-2xl font-display italic mb-8 text-gray-300">
                        "The J Star team didn't just build my software; they taught me how it works. I walked into my defense with 100% confidence. Got an A."
                    </blockquote>
                    <p className="text-sm font-mono uppercase tracking-widest text-gray-500">— Daniel A., UNILAG Computer Science Grade '24</p>
                </div>
            </div>
        </div>
    );
}
