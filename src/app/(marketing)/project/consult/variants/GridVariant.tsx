'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const TEAM = [
    {
        name: 'Jay',
        role: 'Onboarding Expert',
        image: '/images/jay-portrait.png',
        quote: "Yo! I'm your FYP plug. Let's find a topic that'll make your supervisor smile!",
        tags: ['Energetic', 'Hype', 'Nigerian Slang'],
    },
    {
        name: 'Monji',
        role: 'Academic Copilot',
        image: '/images/ai-crew/monji.png',
        quote: "Hi love! Let me help you write with precision and style. What section are we tackling?",
        tags: ['Sweet', 'Articulate', 'Detail-Oriented'],
    },
    {
        name: 'Nengi',
        role: 'General Assistant',
        image: '/images/ai-crew/nengi.png',
        quote: "What's good? Need to brain dump or just vent about your supervisor? I got you.",
        tags: ['Chill', 'Observant', 'Creative'],
    },
];

export function GridVariant() {
    return (
        <div className="min-h-screen bg-dark text-white pt-24 pb-32">
            <div className="container mx-auto px-6 max-w-6xl">
                {/* Header */}
                <header className="text-center mb-16">
                    <span className="text-primary font-bold uppercase tracking-[4px] text-xs mb-4 block">
                        Your Academic Dream Team
                    </span>
                    <h1 className="text-4xl md:text-6xl font-display font-black leading-tight mb-4">
                        Meet <span className="text-gradient">Jay, Monji & Nengi</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Three AI personalities, each specialized for a different phase of your academic journey.
                    </p>
                </header>

                {/* Phase Indicator */}
                <div className="flex justify-center items-center gap-0 mb-16 flex-wrap">
                    {['Discover', 'Research', 'Support'].map((phase, i) => (
                        <div key={phase} className="flex items-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center font-bold text-lg">
                                    {i + 1}
                                </div>
                                <span className="text-xs text-gray-400 text-center">
                                    {phase}<br /><strong>{TEAM[i].name}</strong>
                                </span>
                            </div>
                            {i < 2 && (
                                <div className="w-16 md:w-24 h-0.5 bg-gradient-to-r from-primary to-primary/30 mx-2" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Team Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {TEAM.map((member, i) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-panel rounded-3xl overflow-hidden border-white/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(139,92,246,0.15)] cursor-pointer group"
                        >
                            <div className="relative aspect-square overflow-hidden">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-transparent to-transparent" />
                                <div className="absolute top-4 right-4 px-4 py-2 bg-dark/80 backdrop-blur-xl rounded-xl border border-white/10 flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span>Online</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                                <p className="text-primary text-xs uppercase tracking-wider mb-4">{member.role}</p>
                                <p className="text-gray-400 text-sm italic mb-4">"{member.quote}"</p>
                                <div className="flex flex-wrap gap-2">
                                    {member.tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-500">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mb-16">
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl font-bold uppercase tracking-wide hover:scale-105 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(139,92,246,0.4)]"
                    >
                        Start with Jay
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

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
