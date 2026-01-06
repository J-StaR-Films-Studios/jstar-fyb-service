'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: {
        name?: string | null;
        email?: string | null;
        id?: string;
    } | null;
    context?: {
        page?: string;
        projectId?: string;
    };
}

export function SupportModal({ isOpen, onClose, user, context }: SupportModalProps) {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Sync state with user prop when modal opens
    useEffect(() => {
        if (isOpen) {
            setName(user?.name || '');
            setEmail(user?.email || '');
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/support/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: isAnonymous ? 'Anonymous User' : name,
                    email: isAnonymous ? 'noreply@jstarstudios.com' : email,
                    message,
                    userId: isAnonymous ? undefined : user?.id,
                    page: context?.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
                    projectId: context?.projectId,
                    isAnonymous,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to send message');
            }

            toast.success('Message sent! We\'ll get back to you soon.');
            setMessage('');
            onClose();
        } catch (error) {
            console.error('[SupportModal] Error:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md bg-[#0F0F12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-primary/10 border-b border-primary/20 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Contact Support</h2>
                                <p className="text-xs text-gray-400">We usually respond within 24 hours</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="flex items-center justify-end mb-2">
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary/50"
                                />
                                Send Anonymously
                            </label>
                        </div>

                        {!isAnonymous && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-4 overflow-hidden"
                            >
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required={!isAnonymous}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                                    />
                                </div>
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={isAnonymous ? "Go ahead, speak your mind..." : "How can we help you?"}
                                rows={4}
                                required
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {isAnonymous ? 'Send Secretly' : 'Send Message'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
