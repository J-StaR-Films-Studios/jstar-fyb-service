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
    Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PERSONALITIES } from '@/features/bot/prompts/system';

interface AcademicCopilotProps {
    projectId: string;
    activeChapterId?: string;
    activeChapterNumber?: number;
}

export function AcademicCopilot({ projectId, activeChapterId, activeChapterNumber }: AcademicCopilotProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localInput, setLocalInput] = useState('');

    // Avatar cycling state for personality transition
    const [showAI, setShowAI] = useState(false);
    const cycleTimings = [3000, 5000, 5000, 10000]; // ms
    const cycleIndexRef = useRef(0);

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

    // API endpoint for project-specific chat
    const apiEndpoint = projectId ? `/api/projects/${projectId}/chat` : '/api/chat';
    console.log('[AcademicCopilot] Using API endpoint:', apiEndpoint, 'projectId:', projectId);

    // AI SDK 5.0 requires DefaultChatTransport for custom API endpoints
    const { messages, sendMessage, status, error, setMessages } = useChat({
        transport: new DefaultChatTransport({
            api: apiEndpoint,
            body: {
                projectId,
                chapterId: activeChapterId,
                chapterNumber: activeChapterNumber
            }
        }),
        id: projectId ? `academic-copilot-${projectId}` : 'academic-copilot-fallback',
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // CRITICAL: Guard against undefined projectId AFTER all hooks
    if (!projectId) {
        console.error('[AcademicCopilot] projectId is undefined!');
        return (
            <div className="flex items-center justify-center h-full text-red-400 text-sm p-4">
                Error: Project ID is missing. Please refresh the page.
            </div>
        );
    }

    const quickActions = [
        { id: 'fact-check', icon: Search, label: 'Deep Fact Check', color: 'text-accent', prompt: 'Fact check the last paragraph I wrote using my research library.' },
        { id: 'suggest-edits', icon: Sparkles, label: 'Suggest Edits', color: 'text-primary', prompt: 'Based on my uploaded papers, suggest improvements for this section.' },
        { id: 'cite-source', icon: Quote, label: 'Find Citations', color: 'text-green-400', prompt: 'Find a direct quote from my library that supports the methodology used here.' },
        { id: 'draft-intro', icon: FileText, label: 'Draft Intro', color: 'text-yellow-400', prompt: 'Using the project abstract and research, draft an introduction for this chapter.' }
    ];

    const handleQuickAction = (prompt: string) => {
        setLocalInput(prompt);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localInput.trim() || isLoading) return;

        const userMessage = localInput;
        setLocalInput('');

        try {
            // AI SDK 5.0 uses parts array instead of content
            await sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: userMessage }],
            });
        } catch (err) {
            console.error('[AcademicCopilot] Send failed:', err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark/20 overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

            {/* Chat Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
            >
                {messages.length === 0 ? (
                    /* V3: Empty State Widgets */
                    <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                            <p className="text-xs text-gray-400 max-w-[220px] mx-auto leading-relaxed min-h-[48px] flex items-center">
                                <span className="transition-opacity duration-500">
                                    {showAI
                                        ? "Powered by your research library. Ask me anything about your project."
                                        : "Your academic copilot. I'm trained on your research library to help you write with confidence."
                                    }
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all text-center group active:scale-95"
                                >
                                    <action.icon className={cn("w-5 h-5 mx-auto mb-2 transition-transform group-hover:scale-110", action.color)} />
                                    <span className="text-[10px] font-bold uppercase text-gray-500 group-hover:text-gray-300 tracking-wider">
                                        {action.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* V1: Chat Flow */
                    <div className="space-y-6">
                        {messages.map((m: any) => {
                            // Extract content and tool invocations from potential 'parts' or direct properties
                            let content = '';
                            let toolInvocations: any[] = [];

                            if (m.parts) {
                                m.parts.forEach((p: any) => {
                                    if (p.type === 'text') content += p.text;
                                    else if (p.type?.startsWith('tool-')) toolInvocations.push(p);
                                });
                            } else {
                                content = m.content || '';
                                toolInvocations = m.toolInvocations || [];
                            }

                            return (
                                <div key={m.id} className={cn(
                                    "flex flex-col",
                                    m.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed transition-all shadow-sm",
                                        m.role === 'user'
                                            ? "bg-primary/20 border border-primary/30 text-white rounded-tr-none"
                                            : "bg-white/5 border border-white/5 text-gray-300 rounded-tl-none"
                                    )}>
                                        {content}

                                        {/* Sub-agent / Tool Call Results */}
                                        {toolInvocations.map((toolInvocation: any) => {
                                            const { toolName, toolCallId, state, type } = toolInvocation;
                                            const actualToolName = toolName || type?.replace('tool-', '');

                                            if (state === 'call' || state === 'calling') {
                                                return (
                                                    <div key={toolCallId} className="mt-4 flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Searching library...
                                                    </div>
                                                );
                                            }

                                            if ((state === 'result' || state === 'output-available') && actualToolName === 'searchProjectDocuments') {
                                                // V5: Rich Citation Cards
                                                return (
                                                    <div key={toolCallId} className="mt-4 space-y-3 pt-4 border-t border-white/10">
                                                        <div className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-widest">
                                                            <Search className="w-3 h-3" /> Grounded Result
                                                        </div>
                                                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-accent/30 transition-colors group">
                                                            <p className="text-[11px] text-gray-400 italic mb-2">
                                                                "Source data correlated with your query..."
                                                            </p>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                                                                    <FileText className="w-3 h-3" /> ref_01.pdf
                                                                </div>
                                                                <button className="text-[9px] font-bold text-primary uppercase tracking-tighter hover:text-accent transition-colors flex items-center gap-1">
                                                                    Analyze Further <ArrowRight className="w-2 h-2" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 px-2 animate-pulse">
                                <Terminal className="w-3 h-3" /> Copilot is thinking...
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex items-center gap-3">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Something went wrong. Please try again.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-dark/40 border-t border-white/5">
                <form
                    onSubmit={handleFormSubmit}
                    className="relative"
                >
                    <textarea
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Ask your Academic Copilot..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-xs outline-none focus:border-primary/50 resize-none h-20 transition-all focus:bg-white/[0.07] custom-scrollbar"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleFormSubmit(e as any);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !localInput.trim()}
                        className={cn(
                            "absolute bottom-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            isLoading || !localInput.trim()
                                ? "bg-white/5 text-gray-600"
                                : "bg-primary text-white hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
