'use client';

import { ReactNode } from 'react';
import { BuilderLayoutProvider } from '../context/BuilderLayoutContext';
import { BuilderHeader } from './BuilderHeader';

/**
 * BuilderLayoutWrapper
 * 
 * A client component that wraps the builder page with:
 * 1. BuilderLayoutProvider - provides shared builder state context
 * 2. BuilderHeader - the builder-specific header component
 * 
 * This wrapper is used by the project layout to conditionally
 * apply builder-specific UI when on the builder route.
 */

interface BuilderLayoutWrapperProps {
    children: ReactNode;
}

export function BuilderLayoutWrapper({ children }: BuilderLayoutWrapperProps) {
    return (
        <BuilderLayoutProvider>
            {children}
        </BuilderLayoutProvider>
    );
}

/**
 * BuilderHeaderForLayout
 * 
 * A wrapper that renders BuilderHeader within the BuilderLayoutProvider context.
 * This is needed because BuilderHeader uses useBuilderLayout hook.
 * 
 * Usage: Pass this as the headerContent prop to SaasShell
 */
export function BuilderHeaderForLayout() {
    return (
        <BuilderLayoutProvider>
            <BuilderHeader />
        </BuilderLayoutProvider>
    );
}