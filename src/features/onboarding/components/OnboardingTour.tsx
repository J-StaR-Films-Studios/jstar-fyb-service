'use client';

import { useOnboardingStore, TourStep } from '../store/useOnboardingStore';
import { useTourPosition } from '../hooks/useTourPosition';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export const OnboardingTour = () => {
    const { isActive, steps, currentStepIndex, nextStep, prevStep, skipTour, endTour } = useOnboardingStore();
    
    // Safety check: if active but no steps, stop
    useEffect(() => {
        if (isActive && steps.length === 0) {
            endTour();
        }
    }, [isActive, steps.length, endTour]);

    if (!isActive || !steps[currentStepIndex]) return null;

    const step = steps[currentStepIndex];
    return <TourOverlay step={step} nextStep={nextStep} prevStep={prevStep} skipTour={skipTour} totalSteps={steps.length} currentStepIndex={currentStepIndex} />;
};

interface TourOverlayProps {
    step: TourStep;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    totalSteps: number;
    currentStepIndex: number;
}

const TourOverlay = ({ step, nextStep, prevStep, skipTour, totalSteps, currentStepIndex }: TourOverlayProps) => {
    const rect = useTourPosition(step.targetId);
    
    // If element not found, maybe show a loader or just skip?
    // For now, if no rect, we render nothing (waiting for element)
    if (!rect) return null; 

    // Calculate tooltip position
    const tooltipStyle = getTooltipStyle(rect, step.position);

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
            {/* The Cutout / Highlight */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                    opacity: 1,
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="absolute rounded-lg pointer-events-auto ring-2 ring-primary/50"
                style={{
                    boxShadow: '0 0 0 9999px rgba(3, 0, 20, 0.85)', // The dark overlay
                }}
            />

            {/* The Tooltip */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, ...tooltipStyle }}
                key={step.id}
                className="absolute w-80 pointer-events-auto"
            >
                <div className="bg-dark border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-white text-base">{step.title}</h3>
                        <button onClick={skipTour} aria-label="Skip tour" className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {step.content}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500 font-mono">
                            {currentStepIndex + 1} / {totalSteps}
                        </span>
                        
                        <div className="flex items-center gap-2">
                            {currentStepIndex > 0 && (
                                <Button variant="ghost" size="sm" onClick={prevStep} className="h-8 px-2">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                            )}
                            <Button size="sm" onClick={nextStep} className="h-8 bg-primary hover:bg-primary/90 text-white">
                                {currentStepIndex === totalSteps - 1 ? "Finish" : "Next"}
                                {currentStepIndex < totalSteps - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

function getTooltipStyle(rect: DOMRect, position: string) {
    const gap = 12;
    switch (position) {
        case 'top':
            return { top: rect.top - gap, left: rect.left + rect.width / 2, x: '-50%', y: '-100%' };
        case 'bottom':
            return { top: rect.bottom + gap, left: rect.left + rect.width / 2, x: '-50%', y: '0' };
        case 'left':
            return { top: rect.top + rect.height / 2, left: rect.left - gap, x: '-100%', y: '-50%' };
        case 'right':
            return { top: rect.top + rect.height / 2, left: rect.right + gap, x: '0', y: '-50%' };
        case 'center':
            return { top: '50%', left: '50%', x: '-50%', y: '-50%' };
        default: // bottom default
            return { top: rect.bottom + gap, left: rect.left + rect.width / 2, x: '-50%', y: '0' };
    }
}
