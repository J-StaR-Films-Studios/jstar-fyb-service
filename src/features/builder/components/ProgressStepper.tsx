'use client';

import { Check } from 'lucide-react';
import { useBuilderStore, BuilderStep } from '../store/useBuilderStore';
import { cn } from '@/lib/utils';

const STEPS = [
    { id: 'TOPIC' as BuilderStep, label: 'Topic' },
    { id: 'ABSTRACT' as BuilderStep, label: 'Abstract' },
    { id: 'OUTLINE' as BuilderStep, label: 'Outline' },
];

export function ProgressStepper() {
    const step = useBuilderStore((state) => state.step);
    const currentStepIndex = STEPS.findIndex((item) => item.id === step);

    return (
        <div className="w-full border-b border-rule" aria-label="Project builder progress">
            <ol className="flex w-full items-stretch gap-1 sm:gap-4">
                {STEPS.map((item, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    return (
                        <li key={item.id} aria-current={isActive ? 'step' : undefined} className={cn(
                            'flex min-w-0 flex-1 items-center gap-2 border-b-[3px] px-1 sm:px-3 py-3 text-sm',
                            isActive ? 'border-rust bg-selection text-ink font-bold' : 'border-transparent text-ink-muted'
                        )}>
                            <span className="shrink-0 font-margin-mono text-xs">{isCompleted ? <Check className="h-4 w-4" aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>
                            <span className="truncate sm:whitespace-normal">{item.label}</span>
                            <span className="sr-only">{isCompleted ? 'completed' : isActive ? 'current step' : 'upcoming'}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
