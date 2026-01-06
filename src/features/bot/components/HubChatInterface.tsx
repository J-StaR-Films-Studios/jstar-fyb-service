'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { PERSONALITIES } from '@/features/bot/prompts/system';

interface Project {
    id: string;
    topic: string;
    progressPercentage: number;
}

export function HubChatInterface({ userName, immersiveMode = false }: { userName?: string; immersiveMode?: boolean }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const { messages, sendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/hub/chat',
        }),
        id: 'hub-chat-nengi',
    });

    // Generate intelligent first message based on context
    const generateWelcomeMessage = useCallback((projects: Project[]) => {
        if (projects.length === 0) {
            return `Hey ${userName || 'there'}! I'm Nengi. 👋\n\nI'm here to help you clear your head, brainstorm ideas, or just chat. No projects yet? No worries - let's talk about what's on your mind!`;
        }

        const topProject = projects[0];
        const progressNote = topProject.progressPercentage > 0
            ? ` You're ${topProject.progressPercentage}% through it!`
            : '';

        if (projects.length === 1) {
            return `Hey ${userName || 'there'}! 👋 I'm Nengi, your creative brain dump partner.\n\nI see you're working on "${topProject.topic}".${progressNote}\n\nWhat's on your mind today? Stuck on something, or just want to think out loud?`;
        }

        return `Hey ${userName || 'there'}! 👋 I'm Nengi.\n\nI see you're juggling ${projects.length} projects, with "${topProject.topic}" being the most recent.${progressNote}\n\nNeed to brain dump, vent, or connect some dots? I'm all ears!`;
    }, [userName]);

    // Load existing conversation on mount
    useEffect(() => {
        if (isInitialized) return;

        const loadConversation = async () => {
            try {
                const res = await fetch('/api/hub/chat');
                if (!res.ok) throw new Error('Failed to fetch');

                const data = await res.json();

                if (data.messages && data.messages.length > 0) {
                    // Restore existing conversation
                    setMessages(data.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        parts: [{ type: 'text', text: m.content }]
                    })));
                } else {
                    // Generate intelligent first message
                    const welcomeText = generateWelcomeMessage(data.projects || []);
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: welcomeText,
                        parts: [{ type: 'text', text: welcomeText }]
                    } as any]);
                }
            } catch (err) {
                console.error('[HubChat] Failed to load conversation:', err);
                // Fallback to generic welcome
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hey ${userName || 'there'}! I'm Nengi. 👋\n\nI'm here to help you clear your head, connect ideas across your projects, or just vent about final year stress.\n\nWhat's on your mind today?`,
                    parts: [{ type: 'text', text: `Hey ${userName || 'there'}! I'm Nengi. 👋\n\nI'm here to help you clear your head, connect ideas across your projects, or just vent about final year stress.\n\nWhat's on your mind today?` }]
                } as any]);
            }
            setIsInitialized(true);
        };

        loadConversation();
    }, [isInitialized, setMessages, generateWelcomeMessage, userName]);

    const isLoading = status === 'streaming' || status === 'submitted';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const text = inputValue;
        setInputValue("");

        try {
            await sendMessage({
                role: 'user',
                parts: [{ type: 'text', text }]
            });
        } catch (err) {
            console.error('[HubChat] Send failed:', err);
        }
    };

    const handleClearChat = async () => {
        try {
            await fetch('/api/hub/chat', { method: 'DELETE' });

            // Reset to welcome message
            const res = await fetch('/api/hub/chat');
            const data = await res.json();
            const welcomeText = generateWelcomeMessage(data.projects || []);

            setMessages([{
                id: 'welcome-new',
                role: 'assistant',
                content: welcomeText,
                parts: [{ type: 'text', text: welcomeText }]
            } as any]);

            setShowClearConfirm(false);
        } catch (err) {
            console.error('[HubChat] Clear failed:', err);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] md:h-[calc(100vh-100px)] text-gray-100 font-sans selection:bg-teal-500/30">
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
                                This will delete all messages with Nengi and start fresh. This action cannot be undone.
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
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trash Button - Fixed in corner */}
            <div className="absolute top-2 right-2 z-20">
                <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Clear Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Area - Adjusted padding for immersive mode */}
            <main className={cn(
                "flex-1 overflow-y-auto p-4 md:p-6 space-y-6",
                immersiveMode ? "pb-32" : "pb-40"
            )}>
                {messages.map((m: any) => {
                    let content = '';
                    if (m.parts) {
                        content = m.parts.map((p: any) => p.type === 'text' ? p.text : '').join('');
                    } else {
                        content = m.content || '';
                    }

                    return (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-transparent overflow-hidden relative' : 'bg-primary/20'
                                }`}>
                                {m.role === 'assistant' ? (
                                    <Image
                                        src={PERSONALITIES.nengi.avatar}
                                        alt="Nengi"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="w-4 h-4 text-primary" />
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'items-end' : 'items-start'
                                }`}>
                                <div
                                    className={`px-5 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg ${m.role === 'user'
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
                                        }`}
                                >
                                    {content}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/10">
                            <Image src={PERSONALITIES.nengi.avatar} alt="Nengi" fill className="object-cover" />
                        </div>
                        <div className="flex items-center gap-1.5 h-10 px-4">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-1.5 h-1.5 bg-teal-500 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                className="w-1.5 h-1.5 bg-teal-500 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                className="w-1.5 h-1.5 bg-teal-500 rounded-full"
                            />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area - Fixed at bottom */}
            <div className={cn(
                "fixed bottom-0 left-0 right-0 bg-dark/95 backdrop-blur-xl border-t border-white/5 p-4 md:p-6 z-30",
                immersiveMode ? "pb-6" : "pb-24 md:pb-6"
            )}>
                <footer className="max-w-4xl mx-auto">
                    <form
                        onSubmit={handleSubmit}
                        className="relative flex items-end gap-3"
                    >
                        <div className="relative flex-1">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                placeholder="Type a thought, idea, or question..."
                                rows={1}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-gray-600 resize-none max-h-40 overflow-y-auto"
                                style={{ minHeight: '56px' }}
                            />
                            <div className="absolute right-2 bottom-2">
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={isLoading || !inputValue.trim()}
                                    className="h-10 w-10 rounded-full bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </form>
                    <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                            J Star • Hub Intelligence
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
