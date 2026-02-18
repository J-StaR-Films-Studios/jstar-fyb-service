import { motion } from 'framer-motion';
import { ArrowRight, Check, X, Pencil, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DiagramPreview } from './DiagramPreview';

interface EditSuggestionCardProps {
    chapterNumber: number;
    originalContent?: string;
    newContent?: string;
    explanation?: string;
    onApply: (content: string) => void;
    onReject: () => void;
}

export function EditSuggestionCard({
    chapterNumber,
    originalContent = '',
    newContent = '',
    explanation = 'No explanation provided',
    onApply,
    onReject
}: EditSuggestionCardProps) {
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [editedContent, setEditedContent] = useState(newContent);

    // Guard against missing content - show error state
    const hasMissingContent = !originalContent || !newContent;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 bg-purple-500/10 border border-purple-500/30 rounded-xl overflow-hidden"
        >
            <div className="p-3 bg-purple-500/20 border-b border-purple-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <Pencil className="w-3 h-3" />
                    Suggested Edit (Chapter {chapterNumber})
                </span>
            </div>

            <div className="p-4 space-y-4">
                <p className="text-sm text-gray-300 italic">{explanation}</p>

                {/* Error state for missing content */}
                {hasMissingContent ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">Incomplete Edit Suggestion</p>
                            <p className="text-xs text-yellow-300/70 mt-1">
                                The AI did not provide the full edit content. Please ask it to try again with specific text to replace.
                            </p>
                        </div>
                    </div>
                ) : mode === 'preview' ? (
                    <div className="space-y-3">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-200 opacity-60 line-through">
                            {originalContent.slice(0, 150)}{originalContent.length > 150 ? '...' : ''}
                        </div>
                        <div className="flex justify-center">
                            <ArrowRight className="w-4 h-4 text-purple-400 opacity-50 rotate-90" />
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-100 font-medium">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isMermaid = match && match[1] === 'mermaid';

                                        if (!inline && isMermaid) {
                                            return (
                                                <div className="my-2">
                                                    <DiagramPreview
                                                        code={String(children).replace(/\n$/, '')}
                                                        theme="dark"
                                                        className="w-full"
                                                    />
                                                </div>
                                            );
                                        }

                                        return !inline ? (
                                            <pre className="bg-black/20 p-2 rounded overflow-x-auto text-xs my-1">
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            </pre>
                                        ) : (
                                            <code className="bg-black/20 px-1 rounded text-xs" {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {editedContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                )}
            </div>

            <div className="p-3 bg-black/20 border-t border-white/5 flex items-center gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onReject}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-white/5"
                >
                    <X className="w-4 h-4 mr-2" />
                    {hasMissingContent ? 'Dismiss' : 'Reject'}
                </Button>

                {!hasMissingContent && (
                    <>
                        {mode === 'preview' ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setMode('edit')}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Modify
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setMode('preview')}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                        )}

                        <Button
                            size="sm"
                            onClick={() => onApply(editedContent)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Apply
                        </Button>
                    </>
                )}
            </div>
        </motion.div>
    );
}
