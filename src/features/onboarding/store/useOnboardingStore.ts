import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface TourStep {
    id: string;
    targetId: string; // ID of the element to highlight
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingState {
    isActive: boolean;
    currentStepIndex: number;
    hasCompleted: boolean;
    steps: TourStep[];
    
    startTour: () => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    setSteps: (steps: TourStep[]) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            isActive: false,
            currentStepIndex: 0,
            hasCompleted: false,
            steps: [],

            startTour: () => set({ isActive: true, currentStepIndex: 0 }),
            endTour: () => set({ isActive: false, hasCompleted: true }),
            nextStep: () => {
                const { currentStepIndex, steps } = get();
                if (currentStepIndex < steps.length - 1) {
                    set({ currentStepIndex: currentStepIndex + 1 });
                } else {
                    get().endTour();
                }
            },
            prevStep: () => {
                const { currentStepIndex } = get();
                if (currentStepIndex > 0) {
                    set({ currentStepIndex: currentStepIndex - 1 });
                }
            },
            skipTour: () => set({ isActive: false, hasCompleted: true }),
            setSteps: (steps) => set({ steps }),
            reset: () => set({ isActive: false, currentStepIndex: 0, hasCompleted: false }),
        }),
        {
            name: 'onboarding-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ hasCompleted: state.hasCompleted }), // Only persist completion status
        }
    )
);
