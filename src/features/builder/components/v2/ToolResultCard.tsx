'use client';

import { motion } from 'framer-motion';
import {
    BookOpen,
    List,
    CheckCircle,
    Info,
    Terminal,
    Search,
    FileText,
    Layout,
    GitBranch,
    Plus,
    AlertCircle,
    XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditSuggestionCard } from './EditSuggestionCard';
import { DiagramSuggestionCard } from './DiagramSuggestionCard';

// ============================================================
// TYPES
// ============================================================

/**
 * Props for the ToolResultCard component.
 * Receives unwrapped output from the message bubble.
 */
interface ToolResultCardProps {
    /** The name of the tool that was executed */
    toolName: string;
    /** The input that was passed to the tool */
    input: Record<string, unknown>;
    /** The output data (unwrapped from ToolSuccess) */
    output: Record<string, unknown>;
    /** Optional success message from the tool */
    message?: string;
    /** Whether the tool execution resulted in an error */
    isError?: boolean;
    /** Error message if isError is true */
    errorMessage?: string;
    /** Callback for applying edit suggestions */
    onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
    /** Callback for inserting diagrams */
    onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Generic tool result card that delegates to specific handlers
 * based on tool name. Handles the new ToolSuccess/ToolError wrapper structure.
 */
export function ToolResultCard({
    toolName,
    input,
    output,
    message,
    isError,
    errorMessage,
    onApplyEdit,
    onInsertDiagram,
}: ToolResultCardProps) {
    // Handle error state
    if (isError) {
        return <ErrorCard toolName={toolName} message={errorMessage || 'An error occurred'} />;
    }

    // Tool-specific rendering
    switch (toolName) {
        case 'suggestEdit':
            return (
                <EditSuggestionCard
                    chapterNumber={output.chapterNumber as number}
                    originalContent={(output.original || output.currentContentToReplace || output.currentContent) as string}
                    newContent={(output.replacement || output.newContent || output.newText) as string}
                    explanation={output.explanation as string}
                    onApply={(content) => {
                        if (onApplyEdit) {
                            onApplyEdit(
                                output.chapterNumber as number,
                                (output.original || output.currentContentToReplace) as string,
                                content
                            );
                        }
                    }}
                    onReject={() => {
                        // Optional: track rejection
                        console.log('[ToolResultCard] Edit suggestion rejected');
                    }}
                />
            );

        case 'generateDiagram':
            return (
                <DiagramSuggestionCard
                    title={output.title as string}
                    type={output.type as string}
                    mermaidCode={output.mermaidCode as string}
                    explanation={output.explanation as string}
                    onInsert={() => {
                        if (onInsertDiagram) {
                            onInsertDiagram({
                                mermaidCode: output.mermaidCode as string,
                                title: output.title as string,
                            });
                        }
                    }}
                    onSave={() => {
                        // Optional: save to diagram library
                        console.log('[ToolResultCard] Diagram saved');
                    }}
                    onReject={() => {
                        // Optional: track rejection
                        console.log('[ToolResultCard] Diagram rejected');
                    }}
                />
            );

        case 'searchProjectDocuments':
            return (
                <SearchResultCard
                    query={input.query as string}
                    text={output.text as string}
                    sources={output.sources as Array<{ title?: string; uri?: string }>}
                    hasDocuments={output.hasDocuments as boolean}
                    message={message}
                />
            );

        case 'listChapters':
            return (
                <ChapterListCard
                    chapters={output.chapters as Array<{ number: number; title: string; status: string }>}
                    hasChapters={output.hasChapters as boolean}
                />
            );

        case 'loadChapter':
            return (
                <ChapterLoadCard
                    chapterNumber={output.chapterNumber as number}
                    title={output.title as string}
                    status={output.status as string}
                    contentPreview={output.contentPreview as string}
                    wordCount={output.wordCount as number}
                />
            );

        case 'generateSection':
            return (
                <SectionGeneratedCard
                    chapterNumber={output.chapterNumber as number}
                    sectionTitle={output.sectionTitle as string}
                    isNewChapter={output.isNewChapter as boolean}
                    totalWordCount={output.totalWordCount as number}
                    generatedContent={output.generatedContent as string}
                    message={message}
                />
            );

        case 'addChapter':
            return (
                <ChapterAddedCard
                    number={output.number as number}
                    title={output.title as string}
                    message={message}
                />
            );

        case 'generateChapterOutline':
            return (
                <OutlineCard
                    outline={output.outline as Array<{ number: number; title: string; description?: string }>}
                    focus={output.focus as string | undefined}
                />
            );

        case 'saveUserContext':
            return <ContextSavedCard />;

        default:
            // Generic fallback for unknown tools
            return (
                <GenericToolCard
                    toolName={toolName}
                    output={output}
                    message={message}
                />
            );
    }
}

// ============================================================
// SUB-COMPONENTS FOR SPECIFIC TOOLS
// ============================================================

/**
 * Error display card
 */
function ErrorCard({ toolName, message }: { toolName: string; message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-3 bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden"
        >
            <div className="p-3 bg-red-500/10 flex items-center gap-3 border-b border-red-500/10">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-200">{toolName} Failed</span>
            </div>
            <div className="p-4">
                <p className="text-sm text-red-300">{message}</p>
            </div>
        </motion.div>
    );
}

/**
 * Search results display card
 */
function SearchResultCard({
    query,
    text,
    sources,
    hasDocuments,
    message,
}: {
    query: string;
    text: string;
    sources: Array<{ title?: string; uri?: string }>;
    hasDocuments: boolean;
    message?: string;
}) {
    if (!hasDocuments) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="my-3 bg-amber-500/10 border border-amber-500/20 rounded-xl overflow-hidden"
            >
                <div className="p-3 bg-amber-500/10 flex items-center gap-2 border-b border-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase">No Research Library</span>
                </div>
                <div className="p-4">
                    <p className="text-sm text-amber-200">
                        {message || 'No research documents have been uploaded for this project. Upload documents to enable research search.'}
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-3 bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden"
        >
            <div className="p-2 bg-amber-500/10 flex items-center gap-2 border-b border-amber-500/10">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-500/80 uppercase">Research Findings</span>
            </div>
            <div className="p-3">
                <p className="text-xs text-gray-500 mb-2">Query: "{query}"</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{text}</p>
                {sources && sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                        <p className="text-xs text-gray-500">
                            {sources.length} source{sources.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Chapter list display card
 */
function ChapterListCard({
    chapters,
    hasChapters,
}: {
    chapters: Array<{ number: number; title: string; status: string }>;
    hasChapters: boolean;
}) {
    if (!hasChapters || chapters.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="my-3 bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
                <div className="p-4">
                    <p className="text-sm text-gray-400">
                        No chapters found. Generate an outline to get started.
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-3 bg-gray-800/50 border border-white/10 rounded-xl overflow-hidden"
        >
            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
                <List className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-gray-300 uppercase">Project Chapters</span>
            </div>
            <div className="divide-y divide-white/5">
                {chapters.map((chapter) => (
                    <div
                        key={chapter.number}
                        className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-200">
                                Chapter {chapter.number}: {chapter.title}
                            </span>
                        </div>
                        <span
                            className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                chapter.status === 'COMPLETED'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : chapter.status === 'IN_PROGRESS' || chapter.status === 'EDITING'
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                        : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                            )}
                        >
                            {chapter.status}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

/**
 * Chapter load display card
 */
function ChapterLoadCard({
    chapterNumber,
    title,
    status,
    contentPreview,
    wordCount,
}: {
    chapterNumber: number;
    title: string;
    status: string;
    contentPreview: string;
    wordCount: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-3 bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden shadow-sm"
        >
            <div className="p-3 bg-blue-500/10 flex items-center gap-3 border-b border-blue-500/10">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-200">
                    Loaded Chapter {chapterNumber}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    {status}
                </span>
            </div>
            <div className="p-4">
                <h4 className="text-md font-bold text-white mb-2">{title}</h4>
                <p className="text-xs text-gray-500 mb-2">{wordCount.toLocaleString()} words</p>
                {contentPreview && (
                    <div className="text-xs text-gray-400 italic font-serif leading-relaxed line-clamp-6 bg-black/20 p-3 rounded-lg border border-white/5">
                        "{contentPreview}"
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Section generated success card
 */
function SectionGeneratedCard({
    chapterNumber,
    sectionTitle,
    isNewChapter,
    totalWordCount,
    generatedContent,
    message,
}: {
    chapterNumber: number;
    sectionTitle: string;
    isNewChapter: boolean;
    totalWordCount: number;
    generatedContent?: string;
    message?: string;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-3 bg-green-500/10 border border-green-500/20 rounded-xl overflow-hidden"
        >
            <div className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                    <div className="text-sm font-bold text-green-100">Section Generated</div>
                    <div className="text-xs text-green-400/80">
                        "{sectionTitle}" added to Chapter {chapterNumber}
                        {isNewChapter && ' (new chapter created)'}
                    </div>
                </div>
            </div>
            <div className="px-4 pb-2">
                <p className="text-xs text-gray-500">
                    Chapter now has {totalWordCount.toLocaleString()} words
                </p>
            </div>
            {generatedContent && (
                <div className="px-4 pb-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] text-green-500/60 hover:text-green-400 flex items-center gap-1 mt-1"
                    >
                        {isExpanded ? 'Hide Content' : 'View Generated Content'}
                    </button>
                    {isExpanded && (
                        <div className="mt-2 text-xs text-gray-400 bg-black/20 p-2 rounded border border-white/5 font-serif max-h-60 overflow-y-auto custom-scrollbar">
                            {generatedContent}
                        </div>
                    )}
                </div>
            )}
            {message && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-400">{message}</p>
                </div>
            )}
        </motion.div>
    );
}

/**
 * Chapter added success card
 */
function ChapterAddedCard({
    number,
    title,
    message,
}: {
    number: number;
    title: string;
    message?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-3 bg-green-500/10 border border-green-500/20 rounded-xl overflow-hidden"
        >
            <div className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-green-500" />
                </div>
                <div>
                    <div className="text-sm font-bold text-green-100">Chapter Created</div>
                    <div className="text-xs text-green-400/80">
                        Chapter {number}: "{title}"
                    </div>
                </div>
            </div>
            {message && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-400">{message}</p>
                </div>
            )}
        </motion.div>
    );
}

/**
 * Outline display card
 */
function OutlineCard({
    outline,
    focus,
}: {
    outline: Array<{ number: number; title: string; description?: string }>;
    focus?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-3 bg-white/5 border border-white/10 rounded-xl overflow-hidden"
        >
            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-gray-300 uppercase">Generated Outline</span>
            </div>
            <div className="p-4">
                {focus && (
                    <p className="text-xs text-gray-500 mb-3">Focus: {focus}</p>
                )}
                <ol className="space-y-2">
                    {outline.map((item) => (
                        <li key={item.number} className="text-sm text-gray-300">
                            <span className="font-medium">{item.number}.</span> {item.title}
                            {item.description && (
                                <p className="text-xs text-gray-500 ml-4 mt-0.5">{item.description}</p>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </motion.div>
    );
}

/**
 * Context saved indicator
 */
function ContextSavedCard() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-2 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400"
        >
            <CheckCircle className="w-3 h-3 text-primary" />
            Context saved successfully.
        </motion.div>
    );
}

/**
 * Generic fallback card for unknown tools
 */
function GenericToolCard({
    toolName,
    output,
    message,
}: {
    toolName: string;
    output: Record<string, unknown>;
    message?: string;
}) {
    return (
        <div className="my-2 bg-black/20 rounded-lg border border-white/5 text-xs overflow-hidden">
            <div className="p-2 bg-white/5 flex items-center gap-2 text-gray-500 border-b border-white/5">
                <Terminal className="w-3 h-3" />
                <span className="font-mono">{toolName} Result</span>
            </div>
            <div className="p-3">
                {message && <p className="text-sm text-gray-300 mb-2">{message}</p>}
                <pre className="text-gray-400 whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(output, null, 2)}
                </pre>
            </div>
        </div>
    );
}
