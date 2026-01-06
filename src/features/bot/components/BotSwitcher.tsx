'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Briefcase, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONALITIES } from '@/features/bot/prompts/system';

type BotType = 'jay' | 'nengi' | 'monji';

interface BotSwitcherProps {
    currentBot: BotType;
    latestProjectId?: string;
}

export function BotSwitcher({ currentBot, latestProjectId }: BotSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
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

    // Clear chat handler - works for both Jay and Nengi
    const handleClearChat = async () => {
        setIsClearing(true);
        try {
            if (currentBot === 'nengi') {
                await fetch('/api/hub/chat', { method: 'DELETE' });
            } else if (currentBot === 'jay') {
                await fetch('/api/chat', { method: 'DELETE' });
            }
            // Reload page to reset chat state
            window.location.reload();
        } catch (err) {
            console.error('[BotSwitcher] Clear failed:', err);
        } finally {
            setIsClearing(false);
            setShowClearConfirm(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Bot Switcher Dropdown */}
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

            {/* Trash Button - Only show for Jay and Nengi */}
            {(currentBot === 'jay' || currentBot === 'nengi') && (
                <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Clear Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            {/* Clear Chat Confirmation Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-dark border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-400" />
                                </div>
                                <h3 className="font-display font-bold text-lg">Clear Chat?</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-6">
                                This will delete all messages with {activeBot.name} and start fresh. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearChat}
                                    disabled={isClearing}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold transition-colors disabled:opacity-50"
                                >
                                    {isClearing ? 'Clearing...' : 'Clear All'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
