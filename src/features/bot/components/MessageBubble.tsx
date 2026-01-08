import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';

interface MessageBubbleProps {
    role: "ai" | "user";
    content: React.ReactNode;
    timestamp?: string;
    reasoning?: string; // OpenRouter's reasoning field (separate from content)
}

export function MessageBubble({ role, content, timestamp, reasoning }: MessageBubbleProps) {
    const isAi = role === "ai";
    const [isThinkingOpen, setIsThinkingOpen] = React.useState(false);

    // Extract thinking content from EITHER:
    // 1. Inline <think>...</think> tags (DeepSeek native)
    // 2. Separate reasoning prop (OpenRouter structured response)
    const thinkingMatch = typeof content === 'string' ? content.match(/<think>([\s\S]*?)<\/think>/) : null;
    const thinkingContent = reasoning || (thinkingMatch ? thinkingMatch[1].trim() : null);

    // Remove thinking tags from display content (if present inline)
    const displayContent = typeof content === 'string'
        ? content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        : content;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className={cn(
                "flex gap-4 text-left w-full",
                isAi ? "max-w-full" : "max-w-md ml-auto flex-row-reverse"
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "w-10 h-10 rounded-full hidden md:flex items-center justify-center shrink-0 border shadow-lg overflow-hidden",
                    isAi
                        ? "bg-primary/20 border-primary/30 shadow-primary/20"
                        : "bg-accent/20 border-accent/30 shadow-accent/20"
                )}
            >
                {isAi ? (
                    <img src="/images/jay-portrait.png" alt="Jay" className="w-full h-full object-cover" />
                ) : (
                    <User className="w-5 h-5 text-accent" />
                )}
            </div>

            {/* Content */}
            <div className="space-y-2 w-full">
                <div
                    className={cn(
                        "px-5 py-4 leading-relaxed shadow-lg backdrop-blur-md border",
                        isAi
                            ? "bg-primary/5 border-primary/20 rounded-tr-[1.5rem] rounded-bl-[1.5rem] rounded-br-[1.5rem] rounded-tl-[0.25rem] text-gray-200"
                            : "bg-accent/5 border-accent/20 rounded-tl-[1.5rem] rounded-bl-[1.5rem] rounded-br-[0.25rem] rounded-tr-[1.5rem] text-white"
                    )}
                >
                    {/* Thinking Accordion */}
                    {isAi && thinkingContent && (
                        <div className={cn("text-xs", displayContent && "mb-3")}>
                            <button
                                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                                className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors font-mono uppercase tracking-wider"
                            >
                                <span className={cn("transform transition-transform", isThinkingOpen ? "rotate-90" : "")}>▶</span>
                                Thinking Process
                            </button>
                            {isThinkingOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="mt-2 pl-4 border-l-2 border-primary/20 text-gray-400 italic font-mono whitespace-pre-wrap"
                                >
                                    {thinkingContent}
                                </motion.div>
                            )}
                            {displayContent && <div className="h-px w-full bg-white/10 mt-3" />}
                        </div>
                    )}

                    {/* Main Content - only render if there's actual content */}
                    {displayContent && (
                        isAi && typeof displayContent === 'string' ? (
                            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-a:text-primary prose-ul:text-gray-300 prose-ol:text-gray-300 prose-code:bg-white/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:bg-white/5 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                            </div>
                        ) : (
                            displayContent
                        )
                    )}
                </div>
                {timestamp && (
                    <span className={cn("text-xs text-gray-500 block", !isAi && "text-right")}>
                        {timestamp}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

