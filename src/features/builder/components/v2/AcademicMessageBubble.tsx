import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, ArrowRight, Layout, FileText, Search, Terminal } from 'lucide-react';
import { ToolResultCard } from './ToolResultCard';

// --- Types ---

interface AcademicMessageBubbleProps {
    message: any; // Using any to match existing usage, but ideally should be strongly typed
}

// --- Constants & Helpers ---

const TOOL_CONFIG: Record<string, { name: string; Icon: any }> = {
    'generateDiagram': { name: 'Generating Diagram', Icon: Layout },
    'suggestEdit': { name: 'Preparing Edit Suggestion', Icon: FileText },
    'searchProjectDocuments': { name: 'Searching Documents', Icon: Search },
    'saveUserContext': { name: 'Saving Context', Icon: Terminal },
};

// --- Sub-components ---

function ToolStatusIndicator({ toolName, state }: { toolName: string; state: string }) {
    const toolConfig = TOOL_CONFIG[toolName] || { name: toolName, Icon: Terminal };
    const isComplete = state === 'output-available' || state === 'result' || state === 'completed';
    const IconComponent = toolConfig.Icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-2",
                isComplete
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-primary/10 border border-primary/20 text-primary"
            )}
        >
            <IconComponent className="w-3.5 h-3.5" />
            <span>{toolConfig.name}</span>
            {!isComplete ? (
                <Loader2 className="w-3 h-3 animate-spin ml-auto" />
            ) : (
                <ArrowRight className="w-3 h-3 ml-auto opacity-70" />
            )}
        </motion.div>
    );
}

function ReasoningAccordion({ reasoning, hasContent }: { reasoning: string; hasContent: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={cn("text-xs", hasContent && "mb-3")}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors font-mono uppercase tracking-wider"
            >
                <span className={cn("transform transition-transform", isOpen ? "rotate-90" : "")}>▶</span>
                Thinking Process
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 pl-4 border-l-2 border-primary/20 text-gray-400 italic font-mono whitespace-pre-wrap text-[11px] leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar"
                    >
                        {reasoning}
                    </motion.div>
                )}
            </AnimatePresence>
            {hasContent && <div className="h-px w-full bg-white/10 mt-3" />}
        </div>
    );
}

// --- Main Component ---

export const AcademicMessageBubble = memo(function AcademicMessageBubble({ message: m }: AcademicMessageBubbleProps) {
    // Extract reasoning from either:
    // 1. SDK v6 parts array (during streaming)
    // 2. Database reasoning field (after reload)
    const parts = m.parts || [];
    const reasoningPart = parts.find((p: any) => p.type === 'reasoning');
    const textPart = parts.find((p: any) => p.type === 'text');

    // Extract tool parts (SDK v6 format: part.type === 'tool-{toolName}')
    // Extract tool parts (SDK v6 format) OR db tool invocations
    let toolParts = parts.filter((p: any) =>
        typeof p.type === 'string' && p.type.startsWith('tool-')
    ).map((p: any) => ({
        toolName: p.type.replace('tool-', ''),
        state: p.state || 'pending',
        input: p.input,
        output: p.output
    }));

    // Fallback: If no streaming tool parts, check DB invocations
    if (toolParts.length === 0 && m.toolInvocations && Array.isArray(m.toolInvocations)) {
        toolParts = m.toolInvocations.map((inv: any) => ({
            toolName: inv.toolName,
            // Map DB state 'completed' -> UI state 'result' (to show checkmark/arrow)
            // Map DB state 'pending' -> UI state 'call' (to show spinner)
            state: (inv.state === 'completed' || inv.result) ? 'result' : 'call',
            input: inv.args,
            output: inv.result
        }));
    }

    // Try multiple sources for reasoning content
    const reasoningContent =
        m.reasoning ||  // From database (after reload)
        reasoningPart?.text || reasoningPart?.reasoning || reasoningPart?.content || // From SDK parts (streaming)
        null;
    const textContent = m.content || textPart?.text || '';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "flex w-full mb-4",
                m.role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm backdrop-blur-sm transition-all duration-300",
                m.role === 'user'
                    ? "max-w-[85%] bg-gradient-to-br from-primary to-purple-600 text-white rounded-br-sm shadow-purple-500/10"
                    : "w-full bg-white/10 text-gray-100 rounded-bl-sm border border-white/5 shadow-black/20"
            )}>
                {m.role === 'assistant' ? (
                    <>
                        {/* Reasoning Accordion */}
                        {reasoningContent && (
                            <ReasoningAccordion reasoning={reasoningContent} hasContent={!!textContent || toolParts.length > 0} />
                        )}

                        {/* Tool Status Indicators */}
                        {toolParts.length > 0 && (
                            <div className="mb-3">
                                {toolParts.map((tp: any, idx: number) => (
                                    <ToolStatusIndicator
                                        key={`${m.id}-tool-${tp.toolName}-${idx}`}
                                        toolName={tp.toolName}
                                        state={tp.state}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Main Content */}
                        {textContent && (
                            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-white prose-p:text-gray-200 prose-p:leading-relaxed prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:text-gray-200 prose-ol:text-gray-200 prose-li:marker:text-primary/70 prose-code:bg-white/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:bg-white/5 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2 prose-blockquote:border-l-primary prose-blockquote:text-gray-300 prose-hr:border-white/10">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {textContent}
                                </ReactMarkdown>
                            </div>
                        )}

                        {/* Enhanced Tool Result Renderer */}
                        {!textContent && toolParts.length > 0 && (
                            <div className="mt-2 text-sm">
                                {toolParts.map((part: any, i: number) => {
                                    // Only show result if it exists and isn't handled by custom UI
                                    if (!part.output || ['suggestEdit', 'generateDiagram'].includes(part.toolName)) return null;

                                    return (
                                        <ToolResultCard
                                            key={i}
                                            toolName={part.toolName}
                                            result={part.output}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <span className="font-medium tracking-wide">{textContent}</span>
                )}
            </div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Return true if props are equal (no re-render needed)

    // Performance optimization: 
    // If the message ID is different, it's a different message -> re-render
    if (prevProps.message.id !== nextProps.message.id) return false;

    // If it's the specific message being updated (streaming), we usually rely on object reference change
    // BUT we want to prevent Deep Equal checks on large content if possible.
    // However, since useChat updates the object reference on every chunk, 
    // strict reference equality (prevProps.message === nextProps.message) is the fastest check.
    // If the reference is different, it means the content/status changed.

    // NOTE: This assumes 'message' is immutable and replaced on update (which useChat does)
    return prevProps.message === nextProps.message;
});
