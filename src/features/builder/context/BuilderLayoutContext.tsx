'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useBuilderStore, ProjectData } from '../store/useBuilderStore';
import { toast } from 'sonner';

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
    isResearchUploadOpen: boolean;
    toggleResearchPanel: () => void;
    openResearchPanel: () => void;
    // openResearchUpload opens the panel AND changes it to the upload state
    openResearchUpload: () => void;
    closeResearchPanel: () => void;

    isUploadModalOpen: boolean;
    openUploadModal: () => void;
    closeUploadModal: () => void;

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
    const [isResearchUploadOpen, setIsResearchUploadOpen] = useState(false);

    // Upload modal state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Get data from useBuilderStore
    const { data: projectData, isPaid, saveStatus } = useBuilderStore();

    const toggleResearchPanel = () => {
        if (!isPaid) {
            toast.error("Research Library is a premium feature. Please unlock your project.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setIsResearchPanelOpen(prev => !prev);
        if (isResearchUploadOpen) setIsResearchUploadOpen(false);
    };

    const openResearchPanel = () => {
        if (!isPaid) {
            toast.error("Research Library is a premium feature. Please unlock your project.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setIsResearchPanelOpen(true);
        setIsResearchUploadOpen(false);
    };

    const openResearchUpload = () => {
        if (!isPaid) {
            toast.error("Research Library is a premium feature. Please unlock your project.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setIsResearchPanelOpen(true);
        setIsResearchUploadOpen(true);
    };

    const closeResearchPanel = () => {
        setIsResearchPanelOpen(false);
        setIsResearchUploadOpen(false);
    };

    const openUploadModal = () => setIsUploadModalOpen(true);
    const closeUploadModal = () => setIsUploadModalOpen(false);

    const value: BuilderLayoutContextValue = {
        isResearchPanelOpen,
        isResearchUploadOpen,
        toggleResearchPanel,
        openResearchPanel,
        openResearchUpload,
        closeResearchPanel,
        isUploadModalOpen,
        openUploadModal,
        closeUploadModal,
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
