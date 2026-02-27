'use client';

import { Check } from 'lucide-react';
import { useBuilderStore, BuilderStep } from '../store/useBuilderStore';
import { cn } from '@/lib/utils';

/**
 * ProgressStepper
 * 
 * Circular progress stepper showing the 3-step workflow:
 * - Concept (TOPIC)
 * - Strategy (ABSTRACT)
 * - Blueprint (OUTLINE)
 * 
 * Features:
 * - Completed: Green circle with checkmark
 * - Active: Purple circle with pulse animation
 * - Pending: Gray circle with number
 * - Connecting lines with gradient when active
 */

const STEPS = [
    { id: 'TOPIC' as BuilderStep, label: 'Concept', shortLabel: '1' },
    { id: 'ABSTRACT' as BuilderStep, label: 'Strategy', shortLabel: '2' },
    { id: 'OUTLINE' as BuilderStep, label: 'Blueprint', shortLabel: '3' },
];

export function ProgressStepper() {
    const step = useBuilderStore((state) => state.step);

    // Find current step index
    const currentStepIndex = STEPS.findIndex((s) => s.id === step);

    return (
        <div className="flex items-center justify-center w-full">
            {/* Desktop Layout - Full stepper with labels */}
            <div className="hidden md:flex items-center justify-center gap-1">
                {STEPS.map((stepItem, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    const isPending = index > currentStepIndex;

                    return (
                        <div key={stepItem.id} className="flex items-center">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center">
                                {/* Connecting Line Before (only show after first step) */}
                                {index > 0 && (
                                    <div
                                        className={cn(
                                            "absolute top-4 w-[calc(100%+8px)] h-0.5 -left-1/2 -z-10 transition-all duration-500",
                                            isCompleted ? "bg-gradient-to-r from-green-500 to-primary" : "bg-white/10"
                                        )}
                                        style={{
                                            width: 'calc(100% + 8px)',
                                            left: '-50%'
                                        }}
                                    />
                                )}

                                <div className="relative">
                                    {/* Completed State */}
                                    {isCompleted && (
                                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                            <Check className="w-4 h-4 stroke-[3]" />
                                        </div>
                                    )}

                                    {/* Active State */}
                                    {isActive && (
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] relative">
                                            <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
                                            <span className="relative text-xs font-bold">{stepItem.shortLabel}</span>
                                        </div>
                                    )}

                                    {/* Pending State */}
                                    {isPending && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white/10 text-gray-500 flex items-center justify-center">
                                            <span className="text-xs font-medium">{stepItem.shortLabel}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider mt-2 whitespace-nowrap",
                                    isCompleted ? "text-green-400" :
                                        isActive ? "text-primary" : "text-gray-500"
                                )}>
                                    {stepItem.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile Layout - Compact dots only */}
            <div className="flex md:hidden items-center gap-3">
                {STEPS.map((stepItem, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    const isPending = index > currentStepIndex;

                    return (
                        <div key={stepItem.id} className="flex items-center gap-2">
                            {/* Step Dot */}
                            <div className="relative">
                                {isCompleted && (
                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                )}
                                {isActive && (
                                    <>
                                        <div className="absolute inset-0 bg-primary/30 animate-ping rounded-full" />
                                        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                                    </>
                                )}
                                {isPending && (
                                    <div className="w-3 h-3 rounded-full border border-white/20" />
                                )}
                            </div>

                            {/* Connecting Line Between Dots (except last) */}
                            {index < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "w-8 h-0.5 transition-all duration-300",
                                        isCompleted ? "bg-green-500" : "bg-white/10"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
