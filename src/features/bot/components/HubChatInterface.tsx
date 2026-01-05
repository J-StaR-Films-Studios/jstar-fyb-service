'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Sparkles, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PERSONALITIES } from '@/features/bot/prompts/system';

export function HubChatInterface({ userName }: { userName?: string }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [inputValue, setInputValue] = useState("");
    const { messages, sendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/hub/chat',
        }),
        id: 'hub-chat-nengi',
    });

    // Initial Welcome Message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hey ${userName || 'there'}! I'm Nengi. 👋\n\nI'm here to help you clear your head, connect ideas across your projects, or just vent about final year stress.\n\nWhat's on your mind today?`,
                    parts: [{
                        type: 'text',
                        text: `Hey ${userName || 'there'}! I'm Nengi. 👋\n\nI'm here to help you clear your head, connect ideas across your projects, or just vent about final year stress.\n\nWhat's on your mind today?`
                    }]
                } as any
            ]);
        }
    }, [userName, setMessages]); // Only run once on mount or name change if empty

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

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-dark text-gray-100 font-sans selection:bg-teal-500/30">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-dark/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                        <Image
                            src={PERSONALITIES.nengi.avatar}
                            alt="Nengi"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            {PERSONALITIES.nengi.name}
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-[10px] uppercase tracking-wider font-bold">
                                Hub
                            </span>
                        </h1>
                        <p className="text-xs text-gray-400">Creative Partner & Brain Dump</p>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
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

            {/* Input Area */}
            <footer className="p-4 md:p-6 bg-dark border-t border-white/5">
                <form
                    onSubmit={handleSubmit}
                    className="relative max-w-4xl mx-auto flex items-center gap-3"
                >
                    <div className="relative flex-1">
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a thought, idea, or question..."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-full py-4 pl-6 pr-12 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-gray-600"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
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
    );
}
