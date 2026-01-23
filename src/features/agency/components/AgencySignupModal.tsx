'use client';

import { useState } from 'react';
import { X, HelpCircle, Zap, MessageCircle, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AgencySignupForm } from './AgencySignupForm';

interface AgencySignupModalProps {
    open: boolean;
    onClose: () => void;
    tier: {
        id: string;
        label: string;
        price: number;
        type: 'paper' | 'software';
    };
}

export function AgencySignupModal({ open, onClose, tier }: AgencySignupModalProps) {
    const [view, setView] = useState<'decision' | 'form'>('decision');

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#030014] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors z-20 rounded-full hover:bg-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {view === 'decision' && (
                            <div className="p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                                    <HelpCircle className="w-8 h-8" />
                                </div>

                                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                                    Have you chosen a topic?
                                </h2>
                                <p className="text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
                                    To fast-track your onboarding for the <span className="text-white font-medium">{tier.label}</span> package, we need to know if you already have a topic.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Option A: Fast Track */}
                                    <button
                                        onClick={() => setView('form')}
                                        className="group relative flex flex-col items-center p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">Yes, I'm Ready</h3>
                                        <p className="text-xs text-gray-500 text-center">I have a topic & description.</p>
                                        <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none"></div>
                                    </button>

                                    {/* Option B: Chat */}
                                    <button
                                        onClick={onClose}
                                        className="group flex flex-col items-center p-6 rounded-2xl border border-white/10 bg-transparent hover:bg-white/5 transition-all text-center"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-500/20 text-gray-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">Not Sure Yet</h3>
                                        <p className="text-xs text-gray-500">I need help to decide.</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {view === 'form' && (
                            <div className="relative animate-in fade-in slide-in-from-right-8 duration-300">
                                <button
                                    onClick={() => setView('decision')}
                                    className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white transition-colors z-20 rounded-full hover:bg-white/5 flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="text-xs uppercase font-bold tracking-wider">Back</span>
                                </button>

                                <AgencySignupForm
                                    tierId={tier.id}
                                    price={tier.price}
                                    type={tier.type}
                                    className="border-none shadow-none bg-transparent"
                                />
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
