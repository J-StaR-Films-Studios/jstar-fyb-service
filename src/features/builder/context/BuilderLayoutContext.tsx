'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useBuilderStore, ProjectData } from '../store/useBuilderStore';

/**
 * BuilderLayoutContext
 * 
 * Provides shared state for the builder page layout including:
 * - Research panel open/close state
 * - Project data from useBuilderStore
 * - Payment status (isPaid)
 * 
 * This context is consumed by:
 * - BuilderHeader (for title, save status, research button)
 * - BuilderClient (for step management)
 * - Future: FloatingResearchPanel, ProgressStepper
 */

interface BuilderLayoutContextValue {
    // Research panel state
    isResearchPanelOpen: boolean;
    toggleResearchPanel: () => void;
    openResearchPanel: () => void;
    closeResearchPanel: () => void;

    // Project data (derived from useBuilderStore)
    projectData: ProjectData;
    isPaid: boolean;

    // Save status
    saveStatus: 'saved' | 'saving' | 'error';
}

const BuilderLayoutContext = createContext<BuilderLayoutContextValue | null>(null);

interface BuilderLayoutProviderProps {
    children: ReactNode;
}

export function BuilderLayoutProvider({ children }: BuilderLayoutProviderProps) {
    // Research panel state
    const [isResearchPanelOpen, setIsResearchPanelOpen] = useState(false);

    // Get data from useBuilderStore
    const { data: projectData, isPaid, saveStatus } = useBuilderStore();

    const toggleResearchPanel = () => setIsResearchPanelOpen(prev => !prev);
    const openResearchPanel = () => setIsResearchPanelOpen(true);
    const closeResearchPanel = () => setIsResearchPanelOpen(false);

    const value: BuilderLayoutContextValue = {
        isResearchPanelOpen,
        toggleResearchPanel,
        openResearchPanel,
        closeResearchPanel,
        projectData,
        isPaid,
        saveStatus,
    };

    return (
        <BuilderLayoutContext.Provider value={value}>
            {children}
        </BuilderLayoutContext.Provider>
    );
}

/**
 * Hook to access the BuilderLayoutContext
 * Must be used within a BuilderLayoutProvider
 */
export function useBuilderLayout() {
    const context = useContext(BuilderLayoutContext);
    if (!context) {
        throw new Error('useBuilderLayout must be used within a BuilderLayoutProvider');
    }
    return context;
}

// Re-export the context for advanced use cases
export { BuilderLayoutContext };
