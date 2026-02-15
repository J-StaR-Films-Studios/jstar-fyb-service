"use client";

import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle, AlertCircle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchProgress as ProgressType } from '../services/researchService';

interface ResearchProgressProps {
    logs: ProgressType[];
    currentStep: ProgressType['step'];
}

export function ResearchProgress({ logs, currentStep }: ResearchProgressProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden font-mono text-xs">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                <Terminal className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Research Terminal</span>
                {currentStep === 'completed' && <span className="text-green-400 ml-auto">Done</span>}
                {(currentStep !== 'completed' && currentStep !== 'failed') && (
                    <span className="text-blue-400 ml-auto flex items-center gap-1">
                        Running <Loader2 className="w-3 h-3 animate-spin" />
                    </span>
                )}
            </div>

            {/* Logs Area */}
            <div
                ref={scrollRef}
                className="h-64 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {logs.length === 0 && (
                    <div className="text-gray-600 italic">Waiting for process to start...</div>
                )}

                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-200">
                        <span className="text-gray-600 shrink-0">
                            {/* Timestamp or just > */}
                            {">"}
                        </span>
                        <div className={cn(
                            "break-words",
                            log.step === 'failed' ? "text-red-400" :
                                log.step === 'completed' ? "text-green-400" :
                                    log.step === 'processing' ? "text-blue-300" :
                                        "text-gray-300"
                        )}>
                            {log.message}
                        </div>
                    </div>
                ))}

                {/* Blinking Cursor */}
                {(currentStep !== 'completed' && currentStep !== 'failed') && (
                    <div className="flex gap-2">
                        <span className="text-gray-600">{">"}</span>
                        <span className="w-2 h-4 bg-primary/50 animate-pulse" />
                    </div>
                )}
            </div>
        </div>
    );
}
