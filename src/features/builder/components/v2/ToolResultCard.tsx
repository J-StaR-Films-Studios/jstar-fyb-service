import { motion } from 'framer-motion';
import { BookOpen, List, CheckCircle, Info, Terminal, Search, FileText, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ToolResultCardProps {
    toolName: string;
    result: any;
}

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Helpers to cleanup system noise
    const cleanSystemTags = (text: string) => {
        return text
            .replace(/\[SYSTEM:.*?\]/g, '')
            .replace(/\[INSTRUCTION:.*?\]/g, '')
            .trim();
    };

    // --- Specific Tool Renderers ---

    // 1. loadChapter
    if (toolName === 'loadChapter' && typeof result === 'string') {
        const titleMatch = result.match(/Loaded Chapter (\d+): (.+?)\n/);
        const statusMatch = result.match(/Status: (.+?)\n/);
        const previewMatch = result.match(/Preview:\n([\s\S]+?)(?=\n\n\[|$)/);

        const chapterNum = titleMatch ? titleMatch[1] : '?';
        const title = titleMatch ? titleMatch[2].trim() : 'Chapter Loaded';
        const status = statusMatch ? statusMatch[1].trim() : 'Unknown';
        const preview = previewMatch ? previewMatch[1].trim() : '';

        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-3 bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden shadow-sm"
            >
                <div className="p-3 bg-blue-500/10 flex items-center gap-3 border-b border-blue-500/10">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-200">Loaded Chapter {chapterNum}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                        {status}
                    </span>
                </div>
                <div className="p-4">
                    <h4 className="text-md font-bold text-white mb-2">{title}</h4>
                    {preview && (
                        <div className="text-xs text-gray-400 italic font-serif leading-relaxed line-clamp-6 bg-black/20 p-3 rounded-lg border border-white/5">
                            "{preview}"
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // 2. listChapters
    if (toolName === 'listChapters' && typeof result === 'string') {
        // Extract JSON array
        const jsonMatch = result.match(/\[\s*{[\s\S]*}\s*\]/);
        let chapters = [];
        try {
            if (jsonMatch) {
                chapters = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse listChapters JSON", e);
        }

        if (chapters.length > 0) {
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
                        {chapters.map((c: any, i: number) => (
                            <div key={i} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-200">Chapter {c.number}: {c.title}</span>
                                    <span className="text-[10px] text-gray-500">{c.content ? 'Has content' : 'Empty'}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full border",
                                    c.status === 'COMPLETED' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                        c.status === 'IN_PROGRESS' || c.status === 'EDITING' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                            "bg-gray-500/10 border-gray-500/20 text-gray-400"
                                )}>
                                    {c.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            );
        }
    }

    // 3. searchProjectDocuments
    if (toolName === 'searchProjectDocuments' && typeof result === 'string') {
        const cleanText = cleanSystemTags(result);
        const sourceMatch = cleanText.match(/SOURCES: ([\s\S]*)$/); // Try to extract sources JSON if present at end

        let mainText = cleanText;
        if (sourceMatch) {
            mainText = cleanText.replace(sourceMatch[0], '').trim();
        }

        return (
            <motion.div className="my-3 bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                <div className="p-2 bg-amber-500/10 flex items-center gap-2 border-b border-amber-500/10">
                    <Search className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500/80 uppercase">Research Findings</span>
                </div>
                <div className="p-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {mainText}
                </div>
            </motion.div>
        );
    }

    // 4. generateSection (Success Object)
    if (toolName === 'generateSection' && typeof result === 'object' && result?.status === 'success') {
        return (
            <motion.div className="my-3 bg-green-500/10 border border-green-500/20 rounded-xl overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-green-100">Section Generated</div>
                        <div className="text-xs text-green-400/80">
                            "{result.sectionTitle}" added to Chapter {result.chapterNumber}
                        </div>
                    </div>
                </div>
                {result.generatedContent && (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[10px] text-green-500/60 hover:text-green-400 flex items-center gap-1 mt-1"
                        >
                            {isExpanded ? 'Hide Content' : 'View Generated Content'}
                        </button>
                        {isExpanded && (
                            <div className="mt-2 text-xs text-gray-400 bg-black/20 p-2 rounded border border-white/5 font-serif max-h-60 overflow-y-auto custom-scrollbar">
                                {result.generatedContent}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        );
    }

    // 5. saveUserContext
    if (toolName === 'saveUserContext') {
        return (
            <motion.div className="my-2 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                <CheckCircle className="w-3 h-3 text-primary" />
                Context saved successfully.
            </motion.div>
        );
    }

    // FALLBACK: Generic Friendly Renderer
    // Tries to clean string output or prettify JSON

    let displayContent = result;
    if (typeof result === 'string') {
        displayContent = cleanSystemTags(result);
    } else if (typeof result === 'object') {
        displayContent = JSON.stringify(result, null, 2);
    }

    if (!displayContent) return null;

    return (
        <div className="my-2 bg-black/20 rounded-lg border border-white/5 text-xs overflow-hidden">
            <div className="p-2 bg-white/5 flex items-center gap-2 text-gray-500 border-b border-white/5">
                <Terminal className="w-3 h-3" />
                <span className="font-mono">{toolName} Result</span>
            </div>
            <div className="p-3">
                <pre className="text-gray-400 whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">
                    {displayContent}
                </pre>
            </div>
        </div>
    );
}
