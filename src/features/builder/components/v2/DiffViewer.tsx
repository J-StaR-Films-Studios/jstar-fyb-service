'use client';

import { useMemo } from 'react';
import * as diff from 'diff';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
    oldText: string;
    newText: string;
    mode?: 'unified' | 'split';
    className?: string;
}

export function DiffViewer({ oldText, newText, mode = 'unified', className }: DiffViewerProps) {
    const { unifiedChunks, splitRows } = useMemo(() => {
        const changes = diff.diffLines(oldText, newText);

        // Unified View Data
        const unified = changes;

        // Split View Data Comparison Logic
        // We need to convert the linear diff chunks into aligned rows
        const rows: { left?: { text: string; type: 'removed' | 'unchanged' | 'empty' }; right?: { text: string; type: 'added' | 'unchanged' | 'empty' } }[] = [];

        let i = 0;
        while (i < changes.length) {
            const part = changes[i];
            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();

            if (part.added) {
                // Formatting Added lines (Right side only)
                lines.forEach(line => rows.push({
                    left: { text: '', type: 'empty' },
                    right: { text: line, type: 'added' }
                }));
                i++;
            } else if (part.removed) {
                // Check if next part is added (modified block) to try to align them?
                // For simple implementation, just show removed then checked for added
                // If next is added, we can try to show them side-by-side if lengths match, but simple is safer:
                // Removed on left, empty on right. 
                // Then if next is added, it will be Empty on left, Added on right.
                // Better approach: Check if immediate next is Added.

                const nextPart = changes[i + 1];
                if (nextPart && nextPart.added) {
                    const nextLines = nextPart.value.split('\n');
                    if (nextLines[nextLines.length - 1] === '') nextLines.pop();

                    const maxCount = Math.max(lines.length, nextLines.length);
                    for (let j = 0; j < maxCount; j++) {
                        rows.push({
                            left: j < lines.length ? { text: lines[j], type: 'removed' } : { text: '', type: 'empty' },
                            right: j < nextLines.length ? { text: nextLines[j], type: 'added' } : { text: '', type: 'empty' }
                        });
                    }
                    i += 2; // Skip both
                } else {
                    lines.forEach(line => rows.push({
                        left: { text: line, type: 'removed' },
                        right: { text: '', type: 'empty' }
                    }));
                    i++;
                }
            } else {
                // Unchanged
                lines.forEach(line => rows.push({
                    left: { text: line, type: 'unchanged' },
                    right: { text: line, type: 'unchanged' }
                }));
                i++;
            }
        }

        return { unifiedChunks: unified, splitRows: rows };

    }, [oldText, newText]);

    if (mode === 'split') {
        return (
            <div className={cn("font-mono text-xs w-full overflow-x-auto border rounded border-white/5", className)}>
                <div className="flex min-w-full sticky top-0 bg-gray-900 border-b border-white/5 z-10">
                    <div className="w-1/2 px-4 py-2 text-gray-400 border-r border-white/5 text-center font-bold uppercase tracking-wider text-[10px]">Previous</div>
                    <div className="w-1/2 px-4 py-2 text-gray-400 text-center font-bold uppercase tracking-wider text-[10px]">Current</div>
                </div>
                {splitRows.map((row, idx) => (
                    <div key={idx} className="flex min-w-full hover:bg-white/5 group">
                        {/* Left Column */}
                        <div className={cn(
                            "w-1/2 px-2 py-0.5 border-r border-white/5 overflow-hidden",
                            row.left?.type === 'removed' ? "bg-red-500/20" : "",
                            row.left?.type === 'empty' ? "bg-black/10" : ""
                        )}>
                            <span className={cn(
                                "whitespace-pre-wrap break-all",
                                row.left?.type === 'removed' ? "text-red-300" : "text-gray-400",
                                row.left?.type === 'empty' ? "select-none" : ""
                            )}>
                                {row.left?.text || ' '}
                            </span>
                        </div>
                        {/* Right Column */}
                        <div className={cn(
                            "w-1/2 px-2 py-0.5 overflow-hidden",
                            row.right?.type === 'added' ? "bg-green-500/20" : "",
                            row.right?.type === 'empty' ? "bg-black/10" : ""
                        )}>
                            <span className={cn(
                                "whitespace-pre-wrap break-all",
                                row.right?.type === 'added' ? "text-green-300" : "text-gray-400",
                                row.right?.type === 'empty' ? "select-none" : ""
                            )}>
                                {row.right?.text || ' '}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("font-mono text-xs overflow-x-auto border rounded border-white/5 bg-black/20", className)}>
            {unifiedChunks.map((part, index) => {
                const color = part.added ? 'bg-green-500/10 text-green-300 border-l-2 border-green-500' :
                    part.removed ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500' :
                        'text-gray-400 border-l-2 border-transparent';

                const prefix = part.added ? '+' : part.removed ? '-' : ' ';

                const lines = part.value.split('\n');
                if (lines[lines.length - 1] === '') lines.pop();

                return (
                    <div key={index} className={cn("w-full py-1", color)}>
                        {lines.map((line, lineIdx) => (
                            <div key={lineIdx} className="flex min-w-full px-2 hover:bg-white/5">
                                <span className={cn("w-6 shrink-0 select-none opacity-40 font-bold",
                                    part.added ? "text-green-500" : part.removed ? "text-red-500" : ""
                                )}>{prefix}</span>
                                <span className="whitespace-pre-wrap break-all">{line}</span>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
