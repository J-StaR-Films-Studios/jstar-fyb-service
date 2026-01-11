"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Zap, Globe, FileText, Check, ArrowRight, Loader2, Sparkles, X, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchClient, ResearchPlan } from '@/services/researchClient';
import { ResearchProgress as ProgressType } from '../services/researchService';
import { ResearchProgress } from './ResearchProgress';

interface ResearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onComplete?: () => void;
}

type Mode = 'standard' | 'deep';
type Step = 'select' | 'planning' | 'review' | 'executing' | 'summary';

export function ResearchModal({ isOpen, onClose, projectId, onComplete }: ResearchModalProps) {
    const [mode, setMode] = useState<Mode>('standard');
    const [step, setStep] = useState<Step>('select');
    const [isLoading, setIsLoading] = useState(false);

    // Data
    const [generatedPlan, setGeneratedPlan] = useState<ResearchPlan | null>(null);
    const [deepGoal, setDeepGoal] = useState(''); // TODO: Pre-fill with project topic if passed
    const [logs, setLogs] = useState<ProgressType[]>([]);
    const [currentStep, setCurrentStep] = useState<ProgressType['step']>('planning');

    const handleGeneratePlan = async () => {
        if (mode === 'deep') {
            // Deep mode skips planning phase visible to user, goes straight to execute
            setStep('executing');
            handleExecute();
            return;
        }

        setIsLoading(true);
        try {
            const plan = await ResearchClient.generatePlan(projectId);
            setGeneratedPlan(plan);
            setStep('review');
        } catch (error) {
            console.error(error);
            // Show error toast
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async () => {
        setStep('executing');
        setLogs([]);

        try {
            // Flatten queries for Standard Mode
            let queries: string[] = [];
            if (mode === 'standard' && generatedPlan) {
                queries = [
                    ...generatedPlan.core_problem_queries,
                    ...generatedPlan.technical_queries,
                    ...generatedPlan.context_queries
                ];
            }

            await ResearchClient.executeResearch(
                projectId,
                mode,
                { queries, deepGoal: mode === 'deep' ? deepGoal : undefined },
                (progress) => {
                    setLogs(prev => [...prev, progress]);
                    setCurrentStep(progress.step);
                }
            );

            // Wait a moment before completion if done
            // step update handles completion UI inside terminal? 
            // We can show a "Finish" button when completed.

        } catch (error) {
            setLogs(prev => [...prev, { step: 'failed', message: 'Execution failed unexpectedly.' }]);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isDone = logs.some(l => l.step === 'completed');

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop click */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-400" />
                            Deep Research Agent
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Deploy AI agents to find and acquire academic sources
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 'select' && (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Standard Mode Card */}
                            <button
                                onClick={() => setMode('standard')}
                                className={cn(
                                    "p-4 rounded-xl border text-left transition-all hover:bg-white/5",
                                    mode === 'standard' ? "border-primary bg-primary/5" : "border-white/10"
                                )}
                            >
                                <div className="p-2 bg-blue-500/10 w-fit rounded-lg mb-3">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <h4 className="font-semibold text-sm text-gray-200 mb-1">Standard Research</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Uses Reasoning Models (Chimera) to plan queries, then searches open web.
                                    <span className="block mt-2 text-blue-400 font-mono text-[10px]">Cost: Low • Speed: Fast</span>
                                </p>
                            </button>

                            {/* Deep Mode Card */}
                            <button
                                onClick={() => setMode('deep')}
                                className={cn(
                                    "p-4 rounded-xl border text-left transition-all hover:bg-white/5",
                                    mode === 'deep' ? "border-purple-500 bg-purple-500/5" : "border-white/10"
                                )}
                            >
                                <div className="p-2 bg-purple-500/10 w-fit rounded-lg mb-3">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                                <h4 className="font-semibold text-sm text-gray-200 mb-1">Deep Research</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Uses Gemini 2.0 with Google Search Grounding to find authoritative sources.
                                    <span className="block mt-2 text-purple-400 font-mono text-[10px]">Cost: High • Quality: Best</span>
                                </p>
                            </button>
                        </div>
                    )}

                    {step === 'select' && mode === 'deep' && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <label className="text-xs text-gray-500 mb-1.5 block">Research Goal (Optional override)</label>
                            <input
                                type="text"
                                value={deepGoal}
                                onChange={(e) => setDeepGoal(e.target.value)}
                                placeholder="E.g. Analyze the impact of AI on education..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>
                    )}

                    {step === 'review' && generatedPlan && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
                                <Check className="w-3 h-3 inline mr-1" />
                                Reasoning Complete. Review the generated search queries.
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(generatedPlan).map(([key, queries]) => (
                                    <div key={key}>
                                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">
                                            {key.replace('_', ' ')}
                                        </h5>
                                        <ul className="space-y-1">
                                            {(queries as string[]).map((q, i) => (
                                                <li key={i} className="text-xs text-gray-300 pl-2 border-l-2 border-white/10">
                                                    {q}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'executing' && (
                        <ResearchProgress logs={logs} currentStep={currentStep} />
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end p-4 border-t border-white/5 gap-2 bg-white/[0.02]">
                    {step === 'select' && (
                        <button
                            onClick={handleGeneratePlan}
                            disabled={isLoading}
                            className="bg-white text-black hover:bg-white/90 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {mode === 'deep' ? 'Start Research' : 'Generate Plan'}
                        </button>
                    )}

                    {step === 'review' && (
                        <button
                            onClick={handleExecute}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Zap className="w-4 h-4" />
                            Execute Research
                        </button>
                    )}

                    {step === 'executing' && isDone && (
                        <button
                            onClick={() => {
                                onComplete?.();
                                onClose();
                            }}
                            className="bg-white text-black hover:bg-white/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
