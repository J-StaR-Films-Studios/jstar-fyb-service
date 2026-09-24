'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, ArrowRight, Layout, FileText, Search, Terminal, AlertCircle, User, Bot } from 'lucide-react';
import { isToolUIPart } from 'ai';
import type { AcademicUIMessage } from '@/lib/agents/academic-agent';
import { ToolResultCard } from './ToolResultCard';

// --- Types ---

interface AcademicMessageBubbleProps {
    message: AcademicUIMessage;
    onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
    onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
}

// --- Constants & Helpers ---

const TOOL_CONFIG: Record<string, { name: string; Icon: typeof Layout }> = {
    'generateDiagram': { name: 'Generating Diagram', Icon: Layout },
    'suggestEdit': { name: 'Preparing Edit Suggestion', Icon: FileText },
    'searchProjectDocuments': { name: 'Searching Documents', Icon: Search },
    'saveUserContext': { name: 'Saving Context', Icon: Terminal },
    'generateSection': { name: 'Generating Section', Icon: FileText },
    'loadChapter': { name: 'Loading Chapter', Icon: FileText },
    'listChapters': { name: 'Listing Chapters', Icon: FileText },
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
                    ? "bg-selection border border-rule text-ink"
                    : "bg-paper border border-rule text-rust"
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
                className="flex items-center gap-2 text-ink-muted hover:text-rust transition-colors font-mono uppercase tracking-wider"
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
                        className="mt-2 pl-4 border-l-2 border-rule text-ink-muted italic font-mono whitespace-pre-wrap text-[11px] leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar"
                    >
                        {reasoning}
                    </motion.div>
                )}
            </AnimatePresence>
            {hasContent && <div className="h-px w-full bg-rule mt-3" />}
        </div>
    );
}

// --- Tool Output Type Guards ---

interface ToolSuccess<T = unknown> {
    success: true;
    data: T;
    message?: string;
}

interface ToolError {
    success: false;
    error: string;
    details?: unknown;
}

function isToolSuccess(output: unknown): output is ToolSuccess {
    return (
        typeof output === 'object' &&
        output !== null &&
        'success' in output &&
        (output as Record<string, unknown>).success === true
    );
}

function isToolError(output: unknown): output is ToolError {
    return (
        typeof output === 'object' &&
        output !== null &&
        'success' in output &&
        (output as Record<string, unknown>).success === false
    );
}

/**
 * Extract tool name from part type (e.g., "tool-searchProjectDocuments" -> "searchProjectDocuments")
 * For dynamic-tool parts, toolName is a direct property.
 */
function getToolName(part: { type: string; toolName?: string }): string {
    // Dynamic tools have toolName as a property
    if (part.toolName) {
        return part.toolName;
    }
    // Typed tools have type: "tool-{toolName}"
    if (part.type.startsWith('tool-')) {
        return part.type.replace('tool-', '');
    }
    return part.type;
}

// --- Main Component ---

export function AcademicMessageBubble({
    message,
    onApplyEdit,
    onInsertDiagram
}: AcademicMessageBubbleProps) {
    const isUser = message.role === 'user';

    // Extract parts from the typed message
    const parts = message.parts || [];

    // Extract reasoning from parts
    const reasoningPart = parts.find(p => p.type === 'reasoning');
    const reasoningContent = reasoningPart && 'text' in reasoningPart
        ? reasoningPart.text
        : null;

    // Extract text parts
    const textParts = parts.filter(p => p.type === 'text');
    const textContent = textParts.map(p => p.type === 'text' ? p.text : '').join('');

    // Extract tool parts using isToolUIPart type guard
    const toolParts = parts.filter(isToolUIPart);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "flex w-full mb-4 gap-3",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            {/* Assistant Avatar */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-rust flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message Content */}
            <div className={cn(
                "rounded-md px-4 py-3 text-sm leading-relaxed border border-rule",
                isUser
                    ? "max-w-[85%] bg-selection text-ink order-first"
                    : "w-full bg-writing text-ink"
            )}>
                {isUser ? (
                    // User message - simple text
                    <span className="font-medium tracking-wide">{textContent}</span>
                ) : (
                    // Assistant message - rich content with tools
                    <>
                        {/* Reasoning Accordion */}
                        {reasoningContent && (
                            <ReasoningAccordion
                                reasoning={reasoningContent}
                                hasContent={!!textContent || toolParts.length > 0}
                            />
                        )}

                        {/* Tool Status Indicators */}
                        {toolParts.length > 0 && (
                            <div className="mb-3">
                                {toolParts.map((part, idx) => {
                                    const toolName = getToolName(part);
                                    return (
                                        <ToolStatusIndicator
                                            key={`${message.id}-tool-${toolName}-${idx}`}
                                            toolName={toolName}
                                            state={part.state}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Main Text Content */}
                        {textContent && (
                            <div className="prose prose-sm max-w-none text-ink prose-headings:font-margin prose-headings:text-ink prose-p:text-ink prose-strong:text-ink prose-em:text-ink prose-a:text-rust hover:prose-a:underline prose-li:text-ink prose-code:text-ink prose-code:bg-selection prose-pre:bg-paper prose-pre:text-ink prose-th:text-ink prose-td:text-ink prose-blockquote:border-l-rust prose-blockquote:text-ink-muted">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {textContent}
                                </ReactMarkdown>
                            </div>
                        )}

                        {/* Tool Result Cards */}
                        {toolParts.length > 0 && (
                            <div className="mt-2 text-sm">
                                {toolParts.map((part, idx) => {
                                    const toolName = getToolName(part);

                                    // Skip loading states
                                    if (part.state === 'input-streaming' || part.state === 'input-available') {
                                        return (
                                            <div
                                                key={`${message.id}-tool-loading-${idx}`}
                                                className="bg-selection rounded-md px-4 py-3 border border-rule mb-2"
                                            >
                                                <div className="flex items-center gap-2 text-sm text-ink-muted">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Executing {toolName}...</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Only render if output is available
                                    if (part.state === 'output-available' && part.output) {
                                        const output = part.output;
                                        // Extract input from the part (tool invocations have input property)
                                        const input = (part as { input?: Record<string, unknown> }).input || {};

                                        // Skip suggestEdit/generateDiagram in bubble when no handler —
                                        // AcademicCopilot renders its own standalone card with working handlers
                                        if (toolName === 'suggestEdit' && !onApplyEdit) return null;
                                        if (toolName === 'generateDiagram' && !onInsertDiagram) return null;

                                        // Handle ToolError case
                                        if (isToolError(output)) {
                                            return (
                                                <ToolResultCard
                                                    key={`${message.id}-tool-error-${idx}`}
                                                    toolName={toolName}
                                                    input={input}
                                                    output={{}}
                                                    isError={true}
                                                    errorMessage={output.error}
                                                />
                                            );
                                        }

                                        // Handle ToolSuccess case - extract data and message
                                        if (isToolSuccess(output)) {
                                            return (
                                                <ToolResultCard
                                                    key={`${message.id}-tool-success-${idx}`}
                                                    toolName={toolName}
                                                    input={input}
                                                    output={output.data as Record<string, unknown>}
                                                    message={output.message}
                                                    onApplyEdit={onApplyEdit}
                                                    onInsertDiagram={onInsertDiagram}
                                                />
                                            );
                                        }

                                        // Fallback for legacy/unstructured output
                                        return (
                                            <ToolResultCard
                                                key={`${message.id}-tool-legacy-${idx}`}
                                                toolName={toolName}
                                                input={input}
                                                output={output as Record<string, unknown>}
                                                onApplyEdit={onApplyEdit}
                                                onInsertDiagram={onInsertDiagram}
                                            />
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                </div>
            )}
        </motion.div>
    );
}
