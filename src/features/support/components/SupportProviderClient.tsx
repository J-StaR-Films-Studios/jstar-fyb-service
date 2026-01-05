'use client';

import { useEffect, useState } from 'react';
import { SupportProvider } from '@/features/support/context/SupportContext';

interface SupportProviderClientProps {
    children: React.ReactNode;
    user?: {
        name?: string | null;
        email?: string | null;
        id?: string;
    } | null;
}

/**
 * Client wrapper for SupportProvider to be used in the root layout.
 * Handles client-side rendering requirements for the modal portal.
 */
export const SupportProviderClient = ({ children, user }: SupportProviderClientProps) => {
    return (
        <SupportProvider initialUser={user}>
            {children}
        </SupportProvider>
    );
};
