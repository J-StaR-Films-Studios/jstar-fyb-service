'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const TEAM_PILLS = [
    { name: 'Jay', role: 'Topic Discovery', image: '/images/jay-portrait.png' },
    { name: 'Monji', role: 'Research & Writing', image: '/images/ai-crew/monji.png' },
    { name: 'Nengi', role: 'General Support', image: '/images/ai-crew/nengi.png' },
];

export function HybridVariant() {
    return (
        <div className="min-h-screen bg-dark text-white pt-24 pb-32">
            <div className="container mx-auto px-6 max-w-5xl">
                {/* Hero: Jay as Lead */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative"
                    >
                        <div className="aspect-square rounded-[2rem] overflow-hidden glass-panel border-white/10 relative group">
                            <Image
                                src="/images/jay-portrait.png"
                                alt="Jay"
                                fill
                                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                            />
                        </div>
                        <div className="absolute -top-4 -right-4 px-6 py-4 glass-panel rounded-2xl flex items-center gap-3 border-primary/30">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                            <span className="text-sm font-bold">Consultant Online</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-display font-black mb-6 leading-tight">
                            Expertise is Non-Negotiable.
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed mb-8">
                            Every J Star project is overseen by Jay, our AI-Integrated architect.
                            We don't just "do projects"—we engineer solutions that withstand the most rigorous defense committees.
                        </p>
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-primary rounded-xl font-bold uppercase tracking-wide hover:scale-105 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(139,92,246,0.3)]"
                        >
                            Start Free Consultation
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </section>

                {/* Divider */}
                <div className="text-center mb-16 relative">
                    <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="relative bg-dark px-6 text-gray-600 text-xs uppercase tracking-[3px]">
                        But wait, there's more
                    </span>
                </div>

                {/* AI Team Section */}
                <section className="mb-24">
                    <h2 className="text-2xl font-display font-bold text-center mb-4">Meet the Full AI Crew</h2>
                    <p className="text-gray-500 text-center mb-10">Jay leads the team, but you'll also meet Monji and Nengi along the way.</p>

                    <div className="flex justify-center gap-4 flex-wrap">
                        {TEAM_PILLS.map((member) => (
                            <motion.div
                                key={member.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -4, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                                className="flex items-center gap-4 py-3 pl-3 pr-6 glass-panel rounded-full cursor-pointer transition-all"
                            >
                                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                                    <Image src={member.image} alt={member.name} fill className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{member.name}</h4>
                                    <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Trust Section */}
                <div className="glass-panel p-12 rounded-[2rem] text-center border-white/5">
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
