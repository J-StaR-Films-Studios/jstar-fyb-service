// @ts-nocheck
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Loader2, BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ProgressIndicator } from './ProgressIndicator';

export function ProjectAssistant({ projectId }: { projectId: string }) {
    // AI SDK 5.0 requires DefaultChatTransport for custom API endpoints
    const chatHelpers: any = useChat({
        transport: new DefaultChatTransport({
            api: `/api/projects/${projectId}/chat`,
        }),
        onError: (e) => {
            console.error('[ProjectAssistant] Chat error:', e);
            alert('Failed to send message: ' + e.message);
        },
        onFinish: (message) => {
            console.log('[ProjectAssistant] Stream finished:', message);
        }
    });

    // Destructure properties - 'append' or 'sendMessage' depending on SDK version
    const { messages, isLoading, append, sendMessage } = chatHelpers;

    // Identify the correct function to use
    const sendFunc = append || sendMessage;

    const [input, setInput] = useState('');
    const [showProgress, setShowProgress] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);



    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;

        // Prevent sending if no function is available
        if (!sendFunc) {
            console.error('[ProjectAssistant] No send function (append/sendMessage) found!');
            alert('Chat initialization error. Please refresh.');
            return;
        }

        setInput(''); // Clear input immediately

        try {
            // AI SDK 5.0 uses parts array instead of content
            await sendFunc({
                role: 'user',
                parts: [{ type: 'text', text: userMessage }],
            });
            // Message sent
        } catch (err) {
            console.error('[ProjectAssistant] Send failed:', err);
            alert('Failed to send message');
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px] w-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Project Copilot</h3>
                        <p className="text-xs text-gray-400">Context-aware AI Assistant</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowProgress(!showProgress)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Show Project Progress"
                >
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Progress Section */}
            {showProgress && (
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Project Progress</h4>
                    <ProgressIndicator projectId={projectId} className="w-full" />
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>I know your project details.</p>
                        <p className="text-xs mt-1 opacity-70">Ask me to write a section, improve your abstract, or explain a concept.</p>
                    </div>
                )}

                {messages.map((m: any) => (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                            {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-500/10 text-blue-100 rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm'
                            }`}>
                            <div className="prose prose-invert prose-sm max-w-none">
                                {m.parts ? (
                                    m.parts.map((part: any, i: number) => {
                                        if (part.type === 'text') {
                                            return <ReactMarkdown key={i}>{part.text}</ReactMarkdown>;
                                        }
                                        return null;
                                    })
                                ) : (
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-gray-400 text-xs flex items-center">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your project..."
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
