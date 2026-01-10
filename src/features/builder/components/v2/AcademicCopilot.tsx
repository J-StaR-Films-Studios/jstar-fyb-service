'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useSearchParams, useRouter } from 'next/navigation';
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
    Trash2,
    MessageSquare,
    ChevronLeft
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThreadSelector } from './ThreadSelector';
import { EditSuggestionCard } from './EditSuggestionCard';
import { DiagramSuggestionCard } from './DiagramSuggestionCard';
import { toast } from 'sonner';
import { DownloadOptionsModal } from '@/components/ui/DownloadOptionsModal';
import { PERSONALITIES } from '@/features/bot/prompts/system';

import { AcademicMessageBubble } from './AcademicMessageBubble';

interface AcademicCopilotProps {
    projectId: string;
    activeChapterId?: string;
    activeChapterNumber?: number;
    onClose?: () => void;
    onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
    onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
    onToolCompleted?: () => void;
}

export function AcademicCopilot({ projectId, activeChapterId, activeChapterNumber, onClose, onApplyEdit, onInsertDiagram, onToolCompleted }: AcademicCopilotProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localInput, setLocalInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // URL param handling for thread persistence
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlThreadId = searchParams.get('thread');

    // State for threads
    const [activeThreadId, setActiveThreadId] = useState<string | null>(urlThreadId);
    const [suggestion, setSuggestion] = useState<any | null>(null);
    const [diagramSuggestion, setDiagramSuggestion] = useState<any | null>(null);
    const [lastKnownThread, setLastKnownThread] = useState<{ id: string; title: string } | null>(null);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);

    // Avatar cycling state for personality transition
    const [showAI, setShowAI] = useState(false);
    const cycleTimings = [3000, 5000, 5000, 10000]; // ms
    const cycleIndexRef = useRef(0);

    // Auto-scroll logic with throttling
    const requestRef = useRef<number | null>(null);
    const scrollToBottom = (instant = false) => {
        if (!scrollRef.current) return;

        const target = scrollRef.current;
        const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

        // Only auto-scroll if user is already near bottom or forced
        if (instant || isAtBottom) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            requestRef.current = requestAnimationFrame(() => {
                target.scrollTop = target.scrollHeight;
            });
        }
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // State for input
    const [input, setInput] = useState('');

    // Sync state to ref for access inside closures/fetch
    const activeThreadIdRef = useRef(activeThreadId);
    useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);

    // Update URL when activeThreadId changes (shallow routing)
    const updateUrlWithThread = useCallback((threadId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (threadId) {
            params.set('thread', threadId);
        } else {
            params.delete('thread');
        }
        // Use window.history directly to avoid React re-renders
        // This updates the URL without triggering Next.js routing
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
    }, [searchParams]);

    // Fetch last known thread on mount (for "Continue last chat" button)
    useEffect(() => {
        const fetchLastThread = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/threads`);
                const data = await res.json();
                if (data.success && data.threads?.length > 0) {
                    const mostRecent = data.threads[0];
                    setLastKnownThread({ id: mostRecent.id, title: mostRecent.threadTitle });
                }
            } catch (e) {
                console.error("Failed to fetch threads", e);
            } finally {
                setIsLoadingThreads(false);
            }
        };
        fetchLastThread();
    }, [projectId]);

    // Chat Hook - Use a STABLE ID that doesn't change mid-conversation
    // If we started as a new thread, keep 'new' in the ID even after we get a real thread ID
    // This prevents the hook from reinitializing and clearing messages
    const [stableThreadId] = useState(urlThreadId || 'new');

    const { messages, sendMessage: chatSendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({ api: `/api/projects/${projectId}/chat` }),
        id: `academic-copilot-${projectId}-${stableThreadId}`, // Stable ID - doesn't change mid-conversation
        onError: (error) => {
            console.error("Chat error:", error);
        },
        onFinish: (message) => {
            // Smart Refresh: Check for mutation tools
            const toolInvocations = (message as any).toolInvocations || [];
            const MUTATION_TOOLS = ['generateSection', 'addChapter', 'generateChapterOutline', 'saveUserContext'];

            // Check if any loaded tool is a mutation tool
            const hasMutation = toolInvocations.some((t: any) => MUTATION_TOOLS.includes(t.toolName));

            if (hasMutation && onToolCompleted) {
                console.log("[AcademicCopilot] Mutation tool finished, triggering refresh.");
                onToolCompleted();
            }
        }
    });

    // Auto-load messages when mounting with a URL thread param
    const hasLoadedUrlThread = useRef(false);
    useEffect(() => {
        if (urlThreadId && !hasLoadedUrlThread.current && !isLoadingThreads) {
            hasLoadedUrlThread.current = true;
            // Load messages for the URL thread
            (async () => {
                try {
                    const res = await fetch(`/api/projects/${projectId}/chat?threadId=${urlThreadId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.messages) {
                            setMessages(data.messages);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load URL thread messages", e);
                }
            })();
        }
    }, [urlThreadId, isLoadingThreads, projectId, setMessages]);

    // Handle tool invocations from messages (v6 compatible)
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant') {
            const parts = (lastMessage as any).parts || [];
            const toolInvocations = (lastMessage as any).toolInvocations || [];

            // Helper to find tool result using SDK v6 parts format
            // In v6, tools appear as parts with type = 'tool-{toolName}'
            const findToolResult = (toolName: string) => {
                // SDK v6 format: part.type === 'tool-{toolName}'
                const toolPartType = `tool-${toolName}`;
                const part = parts.find((p: any) =>
                    p.type === toolPartType && p.state === 'output-available'
                );
                if (part?.output) return part.output;

                // Fallback: Also check for legacy toolInvocations (for DB-loaded messages)
                const invocation = toolInvocations.find((t: any) => t.toolName === toolName);
                if (invocation && 'result' in invocation) return invocation.result;

                return null;
            };

            // Handle Suggest Edit
            const editResult = findToolResult('suggestEdit');
            if (editResult) {
                setSuggestion(editResult);
            }

            // Handle Generate Diagram
            const diagramResult = findToolResult('generateDiagram');
            if (diagramResult) {
                setDiagramSuggestion(diagramResult);
            }
        }
    }, [messages]);

    const handleSaveDiagram = async (diagram: any, alsoInsert: boolean = false) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/diagrams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: diagram.title || 'Untitled Diagram',
                    diagramType: diagram.type || 'flowchart',
                    mermaidCode: diagram.mermaidCode,
                    description: diagram.explanation || 'AI Generated Diagram'
                })
            });
            if (res.ok) {
                toast.success('Diagram saved to project');
                setDiagramSuggestion(null);
                // Also insert into document if requested
                if (alsoInsert && onInsertDiagram) {
                    onInsertDiagram({ mermaidCode: diagram.mermaidCode, title: diagram.title || 'Diagram' });
                    toast.success('Diagram inserted into document');
                }
            } else {
                toast.error('Failed to save diagram');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error saving diagram');
        }
    };

    // Helper to extract diagrams from text
    const extractDiagramsFromText = (text: string) => {
        const diagrams: { code: string; type: string }[] = [];
        const regex = /```mermaid\s*([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const code = match[1].trim();
            // Try to detect type from first word
            const firstWord = code.split(/\s+/)[0];
            const type = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey'].includes(firstWord)
                ? firstWord
                : 'flowchart';

            diagrams.push({ code, type });
        }

        return diagrams;
    };

    const handleApplySuggestion = async (content: string) => {
        if (!suggestion) return;

        // 1. Scan for diagrams and save/notify
        const diagrams = extractDiagramsFromText(content);
        if (diagrams.length > 0) {
            console.log("Detected diagrams in suggestion:", diagrams.length);
            for (const d of diagrams) {
                // Determine a title (fallback to generic)
                const title = `Insight Diagram (Ch ${suggestion.chapterNumber})`;

                await handleSaveDiagram({
                    mermaidCode: d.code,
                    title: title,
                    type: d.type,
                    explanation: 'Automatically saved from accepted edit suggestion.'
                }, false); // don't double insert, the text insertion handles it
            }
            if (diagrams.length === 1) toast.success("Diagram saved to library");
            else toast.success(`${diagrams.length} diagrams saved to library`);
        }

        // 2. Apply the edit
        if (onApplyEdit) {
            onApplyEdit(suggestion.chapterNumber, suggestion.original, content);
            toast.success('Edit applied to chapter');
        }
        setSuggestion(null);
    };

    const handleRejectSuggestion = () => {
        setSuggestion(null);
        toast.info('Edit suggestion dismissed');
    };

    const isLoading = status === 'submitted' || status === 'streaming';

    // Wrapper to maintain compatibility with existing 'sendMessage' calls while injecting dynamic body
    const sendMessage = async (payload: { text: string }) => {
        let currentThreadId = activeThreadIdRef.current;
        let wasNewThread = false;

        // RACE CONDITION FIX: Ensure thread exists BEFORE sending message
        if (!currentThreadId) {
            wasNewThread = true;
            try {
                // Determine context
                const contextScope = activeChapterNumber ? { chapterNumbers: [activeChapterNumber] } : {};

                // Explicitly create thread first
                const res = await fetch(`/api/projects/${projectId}/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'general',
                        title: payload.text.slice(0, 30) || 'New Conversation',
                        contextScope
                    })
                });
                const data = await res.json();

                if (data.success && data.thread) {
                    currentThreadId = data.thread.id;
                    setActiveThreadId(currentThreadId);
                    updateUrlWithThread(currentThreadId);

                    // Update ref immediately to prevent race in subsequent calls
                    activeThreadIdRef.current = currentThreadId;
                }
            } catch (e) {
                console.error("Failed to pre-create thread", e);
                // Fallback: let useChat handle it (but risk race condition)
            }
        }

        await chatSendMessage({
            text: payload.text,
        }, {
            body: {
                threadId: currentThreadId, // Use the resolved ID
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

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        // Only scroll if we are NOT loading history, or if it's a new message
        if (!isLoadingThreads) {
            scrollToBottom();
        }
    }, [messages, suggestion, isLoadingThreads]);

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
        updateUrlWithThread(threadId);
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
                updateUrlWithThread(data.thread.id);
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
    // Avatar animation cycle - Paused during thinking
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // Don't animate if loading (thinking) to save resources on mobile
        if (isLoading) return;

        const cycle = () => {
            setShowAI(prev => !prev);
            cycleIndexRef.current = (cycleIndexRef.current + 1) % cycleTimings.length;
            const nextDelay = cycleTimings[cycleIndexRef.current];
            timeoutId = setTimeout(cycle, nextDelay);
        };

        timeoutId = setTimeout(cycle, cycleTimings[0]);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isLoading]);

    return (
        <div className="flex flex-col h-full bg-dark/20 overflow-hidden relative">

            {/* Header with Thread Selector */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 z-30 bg-zinc-950/95 backdrop-blur-md shadow-sm pointer-events-auto">
                <div className="flex items-center gap-3">
                    {onClose ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all z-50 shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                    )}
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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-gray-400 shadow-sm">
                    <Layout className="w-3 h-3 text-primary/70" />
                    {activeChapterNumber ? `Ch ${activeChapterNumber}` : 'Full Project'}
                </div>
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

            {/* Chat Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 pb-48 space-y-6 custom-scrollbar"
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
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

                                {/* Continue Last Chat Button */}
                                {lastKnownThread && !activeThreadId && (
                                    <button
                                        onClick={() => handleThreadSelect(lastKnownThread.id)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary hover:bg-primary/20 transition-all mt-4 group"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Continue: {lastKnownThread.title || 'Last Chat'}</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {messages.map((m: any) => (
                        <AcademicMessageBubble key={m.id} message={m} />
                    ))}

                    {/* Active Edit Suggestion */}
                    {suggestion && (
                        <EditSuggestionCard
                            chapterNumber={suggestion.chapterNumber}
                            originalContent={suggestion.original}
                            newContent={suggestion.replacement}
                            explanation={suggestion.explanation}
                            onApply={handleApplySuggestion}
                            onReject={handleRejectSuggestion}
                        />
                    )}

                    {/* Active Diagram Suggestion */}
                    {diagramSuggestion && (
                        <DiagramSuggestionCard
                            title={diagramSuggestion.title || 'AI Diagram'}
                            type={diagramSuggestion.type || 'flowchart'}
                            mermaidCode={diagramSuggestion.mermaidCode}
                            explanation={diagramSuggestion.explanation}
                            onInsert={() => handleSaveDiagram(diagramSuggestion, true)}
                            onSave={() => handleSaveDiagram(diagramSuggestion, false)}
                            onReject={() => {
                                setDiagramSuggestion(null);
                                toast.info('Diagram dismissed');
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

            {/* Floating Command Center Input */}
            <div className="p-4 pb-2 md:pb-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark via-dark/80 to-transparent pt-12">
                {/* Quick Actions (Contextual) */}
                <AnimatePresence>
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mask-fade-right px-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {[
                                "Summarize my research so far",
                                "Draft the introduction for this chapter",
                                "Find quotes about... ",
                                "Critique my argument flow"
                            ].map((action, i) => (
                                <button
                                    key={`quick-action-${i}`}
                                    onClick={() => handleQuickAction(action)}
                                    className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 hover:border-primary/30 transition-all flex items-center gap-2 hover:-translate-y-0.5 shadow-sm"
                                >
                                    <Sparkles className="w-3 h-3 text-primary/70" />
                                    {action}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSend} className="relative group">
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl blur-xl transition-opacity duration-500",
                        input ? "opacity-100" : "opacity-0"
                    )} />

                    <div className="relative flex items-end p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 transition-all duration-300 group-focus-within:border-primary/50 group-focus-within:bg-black/40 group-focus-within:shadow-primary/10">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={activeChapterNumber ? `Ask about Chapter ${activeChapterNumber}...` : "How can I help you write?"}
                            className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-500 px-4 py-3 focus:ring-0 outline-none min-h-[44px] max-h-[200px] resize-none overflow-y-auto w-full custom-scrollbar"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="mb-1 mr-1 p-2 rounded-xl bg-primary text-white disabled:opacity-50 disabled:bg-gray-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
                <div className="text-[10px] text-center text-gray-600 mt-2 font-medium">
                    Monji can make mistakes. Verify important info.
                </div>
            </div>
        </div>
    );
}
