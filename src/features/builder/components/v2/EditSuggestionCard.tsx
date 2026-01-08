import { motion } from 'framer-motion';
import { ArrowRight, Check, X, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface EditSuggestionCardProps {
    chapterNumber: number;
    originalContent: string;
    newContent: string;
    explanation: string;
    onApply: (content: string) => void;
    onReject: () => void;
}

export function EditSuggestionCard({
    chapterNumber,
    originalContent,
    newContent,
    explanation,
    onApply,
    onReject
}: EditSuggestionCardProps) {
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [editedContent, setEditedContent] = useState(newContent);

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

                {mode === 'preview' ? (
                    <div className="space-y-3">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-200 opacity-60 line-through">
                            {originalContent.slice(0, 150)}{originalContent.length > 150 ? '...' : ''}
                        </div>
                        <div className="flex justify-center">
                            <ArrowRight className="w-4 h-4 text-purple-400 opacity-50 rotate-90" />
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-100 font-medium">
                            {editedContent}
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
                    Reject
                </Button>

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
            </div>
        </motion.div>
    );
}
