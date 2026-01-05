'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Briefcase, Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONALITIES } from '@/features/bot/prompts/system';

type BotType = 'jay' | 'nengi' | 'monji';

interface BotSwitcherProps {
    currentBot: BotType;
    latestProjectId?: string;
}

export function BotSwitcher({ currentBot, latestProjectId }: BotSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const bots = [
        {
            id: 'nengi',
            name: PERSONALITIES.nengi.name,
            role: 'Creative Hub',
            href: '/hub',
            icon: Sparkles,
            avatar: PERSONALITIES.nengi.avatar
        },
        {
            id: 'jay',
            name: PERSONALITIES.jay.name,
            role: 'Sales & Onboarding',
            href: '/chat',
            icon: MessageSquare,
            avatar: PERSONALITIES.jay.avatar
        },
        {
            id: 'monji',
            name: PERSONALITIES.monji.name,
            role: 'Academic Workspace',
            // If we have a project ID, go to workspace. Else, dashboard to pick one.
            href: latestProjectId ? `/project/${latestProjectId}/workspace` : '/dashboard',
            icon: Briefcase,
            avatar: PERSONALITIES.monji.avatar
        }
    ];

    const activeBot = bots.find(b => b.id === currentBot) || bots[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors group"
            >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 group-hover:border-teal-500/50 transition-colors">
                    <Image
                        src={activeBot.avatar}
                        alt={activeBot.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="text-left">
                    <h1 className="font-bold text-sm flex items-center gap-2">
                        {activeBot.name}
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold",
                            activeBot.id === 'nengi' ? "bg-teal-500/10 text-teal-400" :
                                activeBot.id === 'jay' ? "bg-indigo-500/10 text-indigo-400" :
                                    "bg-amber-500/10 text-amber-400"
                        )}>
                            {activeBot.role.split(' ')[0]}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 text-gray-500 transition-transform", isOpen && "rotate-180")} />
                    </h1>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-dark/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-1.5 space-y-0.5">
                            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest bg-white/5 mx-[-6px] mt-[-6px] mb-2 border-b border-white/5">
                                Switch AI Persona
                            </div>

                            {bots.map((bot) => (
                                <Link
                                    key={bot.id}
                                    href={bot.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                        currentBot === bot.id
                                            ? "bg-primary/20 text-white"
                                            : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
                                    )}
                                >
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                                        <Image
                                            src={bot.avatar}
                                            alt={bot.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className={cn("text-sm font-bold", currentBot === bot.id && "text-teal-400")}>
                                            {bot.name}
                                        </p>
                                        <p className="text-[10px] opacity-70">
                                            {bot.role}
                                        </p>
                                    </div>
                                    {currentBot === bot.id && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-teal-500" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
