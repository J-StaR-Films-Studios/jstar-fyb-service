'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Image from 'next/image';
import {
    BrainCircuit,
    Send,
    Sparkles,
    Search,
    FileText,
    AlertCircle,
    Loader2,
    Quote,
    ArrowRight,
    Terminal,
    ChevronDown,
    Layout,
    Trash2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThreadSelector } from './ThreadSelector';
import { EditSuggestionCard } from './EditSuggestionCard';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { PERSONALITIES } from '@/features/bot/prompts/system';

interface AcademicCopilotProps {
    projectId: string;
    activeChapterId?: string;
    activeChapterNumber?: number;
}

export function AcademicCopilot({ projectId, activeChapterId, activeChapterNumber }: AcademicCopilotProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localInput, setLocalInput] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // State for threads
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<any | null>(null);

    // Avatar cycling state for personality transition
    const [showAI, setShowAI] = useState(false);
    const cycleTimings = [3000, 5000, 5000, 10000]; // ms
    const cycleIndexRef = useRef(0);

    // Auto-scroll logic
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // State for input
    const [input, setInput] = useState('');

    // Sync state to ref for access inside clousures/fetch
    const activeThreadIdRef = useRef(activeThreadId);
    useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);

    // Chat Hook
    const { messages, sendMessage: chatSendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({ api: `/api/projects/${projectId}/chat` }),
        id: `academic-copilot-${projectId}`, // Unique ID per project to avoid collision
        onError: (error) => {
            console.error("Chat error:", error);
        }
    });

    // Handle tool invocations from messages (v6 compatible)
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant') {
            // In v6, tool invocations are in the 'parts' array of the message
            const parts = (lastMessage as any).parts || [];
            const toolPart = parts.find((p: any) =>
                p.type === 'tool-invocation' && p.toolInvocation?.toolName === 'suggestEdit'
            );
            if (toolPart?.toolInvocation?.result) {
                setSuggestion(toolPart.toolInvocation.result);
            }
        }
    }, [messages]);

    const isLoading = status === 'submitted' || status === 'streaming';

    // Wrapper to maintain compatibility with existing 'sendMessage' calls while injecting dynamic body
    const sendMessage = async (payload: { text: string }) => {
        console.log("[AcademicCopilot] Sending message with threadId:", activeThreadIdRef.current);

        await chatSendMessage({
            text: payload.text,
        }, {
            body: {
                threadId: activeThreadIdRef.current,
                contextScope: activeChapterNumber ? { chapterNumbers: [activeChapterNumber] } : {}
            }
        });
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');

        await sendMessage({ text: userMessage });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, suggestion]);

    // Internal helper to load messages
    const loadThreadMessages = async (threadId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/chat?threadId=${threadId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            }
        } catch (error) {
            console.error("Failed to load thread messages", error);
        }
    };

    // Handle Thread Switching
    const handleThreadSelect = async (threadId: string | null) => {
        setActiveThreadId(threadId);
        setSuggestion(null);
        if (threadId) {
            setMessages([]); // Clear view while loading
            await loadThreadMessages(threadId);
        } else {
            setMessages([]);
        }
    };

    const handleCreateThread = async (type: 'general' | 'chapter' | 'research', title?: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    title: title || `New ${type} discussion`,
                    contextScope: activeChapterNumber ? { chapterNumbers: [activeChapterNumber] } : {}
                })
            });
            const data = await res.json();
            if (data.success) {
                setActiveThreadId(data.thread.id);
                setMessages([]);
            }
        } catch (e) {
            console.error("Failed to create thread", e);
        }
    };

    const handleQuickAction = (prompt: string) => {
        sendMessage({ text: prompt });
    };

    // Avatar animation cycle
    useEffect(() => {
        const cycle = () => {
            setShowAI(prev => !prev);
            cycleIndexRef.current = (cycleIndexRef.current + 1) % cycleTimings.length;
            const nextDelay = cycleTimings[cycleIndexRef.current];
            timeoutRef.current = setTimeout(cycle, nextDelay);
        };

        let timeoutRef = { current: null as NodeJS.Timeout | null };
        timeoutRef.current = setTimeout(cycle, cycleTimings[0]);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-dark/20 overflow-hidden relative">

            {/* Header with Thread Selector */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 z-30 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <ThreadSelector
                            projectId={projectId}
                            activeThreadId={activeThreadId}
                            onThreadSelect={handleThreadSelect}
                            onCreateThread={handleCreateThread}
                        />
                    </div>
                </div>

                {/* Context Indicator */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase font-bold text-gray-400">
                    <Layout className="w-3 h-3" />
                    {activeChapterNumber ? `Chapter ${activeChapterNumber}` : 'Full Project (DEBUG)'}
                </div>
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

            {/* Chat Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
            >
                <AnimatePresence mode="popLayout">
                    {messages.length === 0 && (
                        /* Empty State */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="h-full flex flex-col items-center justify-center space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <div className="relative w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
                                    {/* Monji Avatar */}
                                    <div className={cn(
                                        "absolute inset-0 transition-all duration-700 ease-in-out border-2 border-amber-500/30 rounded-2xl overflow-hidden",
                                        showAI ? "opacity-0 scale-90" : "opacity-100 scale-100"
                                    )}>
                                        <Image
                                            src={PERSONALITIES.monji.avatar}
                                            alt="Monji"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    {/* AI Icon */}
                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center bg-primary/20 border-2 border-primary/30 rounded-2xl transition-all duration-700 ease-in-out",
                                        showAI ? "opacity-100 scale-100" : "opacity-0 scale-110"
                                    )}>
                                        <BrainCircuit className="w-8 h-8 text-primary" />
                                    </div>
                                </div>
                                <h3 className="font-display font-bold text-white text-lg transition-all duration-500">
                                    {showAI ? "Academic AI" : "Monji"}
                                </h3>
                                <div className="text-xs text-gray-400 max-w-[220px] mx-auto leading-relaxed min-h-[48px] flex flex-col items-center justify-center">
                                    <span className="transition-opacity duration-500 block mb-1">
                                        {showAI
                                            ? "Powered by your research library."
                                            : "Your academic copilot."
                                        }
                                    </span>
                                    <span className="text-primary/70 block">
                                        {activeChapterNumber
                                            ? `Focused on Chapter ${activeChapterNumber}`
                                            : "Ready to help plan or research."
                                        }
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {messages.map((m: any) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                                "flex w-full mb-4",
                                m.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                                m.role === 'user'
                                    ? "bg-primary text-white rounded-br-none"
                                    : "bg-white/10 text-gray-100 rounded-bl-none border border-white/5"
                            )}>
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        {/* Handle AI SDK v5 message format: parts array or content string */}
                                        {(() => {
                                            const textContent = m.content || m.parts?.find((p: any) => p.type === 'text')?.text || '';
                                            return (textContent as string).split('\n').map((line: string, i: number) => (
                                                <p key={i} className="mb-1 last:mb-0 min-h-[1em]">{line}</p>
                                            ));
                                        })()}
                                    </div>
                                ) : (
                                    <span>{m.content || m.parts?.find((p: any) => p.type === 'text')?.text || ''}</span>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {/* Active Edit Suggestion */}
                    {suggestion && (
                        <EditSuggestionCard
                            chapterNumber={suggestion.chapterNumber}
                            originalContent={suggestion.original}
                            newContent={suggestion.replacement}
                            explanation={suggestion.explanation}
                            onApply={(content) => {
                                setSuggestion(null);
                                sendMessage({ text: `Applied edit: ${content.substring(0, 20)}...` });
                            }}
                            onReject={() => {
                                setSuggestion(null);
                                sendMessage({ text: "I rejected that suggestion." });
                            }}
                        />
                    )}

                    {isLoading && (
                        <motion.div className="flex justify-start w-full">
                            <div className="bg-white/5 rounded-2xl rounded-bl-none px-4 py-3 border border-white/5 flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
                {/* Quick Actions (Contextual) */}
                {messages.length === 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mask-fade-right">
                        {[
                            "Summarize my research so far",
                            "Draft the introduction for this chapter",
                            "Find quotes about... ",
                            "Critique my argument"
                        ].map(action => (
                            <button
                                key={action}
                                onClick={() => handleQuickAction(action)}
                                className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder={activeChapterNumber ? `Ask about Chapter ${activeChapterNumber}...` : "Ask monji..."}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 text-white placeholder-gray-500 transition-all shadow-inner"
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 shadow-lg shadow-primary/20",
                            input.trim() ? "bg-primary hover:bg-primary/90 scale-100" : "bg-white/10 text-gray-500 scale-95"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
                <div className="text-[10px] text-center text-gray-600 mt-2 font-medium">
                    Monji can make mistakes. Verify important info.
                </div>
            </div>
        </div>
    );
}
