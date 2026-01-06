'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { SupportModal } from '../components/SupportModal';

interface SupportUser {
    name?: string | null;
    email?: string | null;
    id?: string;
}

interface SupportContextValue {
    openSupport: (context?: { page?: string; projectId?: string }) => void;
    setUser: (user: SupportUser | null) => void;
}

const SupportContext = createContext<SupportContextValue | null>(null);

export const useSupport = () => {
    const context = useContext(SupportContext);
    if (!context) {
        throw new Error('useSupport must be used within a SupportProvider');
    }
    return context;
};

interface SupportProviderProps {
    children: React.ReactNode;
    initialUser?: SupportUser | null;
}

export const SupportProvider = ({ children, initialUser }: SupportProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [contextData, setContextData] = useState<{ page?: string; projectId?: string }>({});
    const [user, setUserState] = useState<SupportUser | null>(initialUser || null);

    const openSupport = useCallback((context?: { page?: string; projectId?: string }) => {
        setContextData(context || {});
        setIsOpen(true);
    }, []);

    const setUser = useCallback((newUser: SupportUser | null) => {
        setUserState(newUser);
    }, []);

    return (
        <SupportContext.Provider value={{ openSupport, setUser }}>
            {children}
            <SupportModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={user}
                context={contextData}
            />
        </SupportContext.Provider>
    );
};

