'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Cloud, CloudOff, Loader2, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// Save Status Context - Shared across app
// ==========================================

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveContextType {
    status: SaveStatus;
    lastSaved: Date | null;
    setStatus: (status: SaveStatus) => void;
    triggerSave: () => void;
    registerSaveHandler: (handler: () => Promise<void>) => void;
}

const SaveContext = createContext<SaveContextType | null>(null);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(null);

    // Auto-clear "saved" status after 2 seconds
    useEffect(() => {
        if (status === 'saved') {
            const timer = setTimeout(() => setStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const triggerSave = useCallback(async () => {
        if (saveHandler && status !== 'saving') {
            setStatus('saving');
            try {
                await saveHandler();
                setLastSaved(new Date());
                setStatus('saved');
            } catch {
                setStatus('error');
            }
        }
    }, [saveHandler, status]);

    const registerSaveHandler = useCallback((handler: () => Promise<void>) => {
        setSaveHandler(() => handler);
    }, []);

    return (
        <SaveContext.Provider value={{ status, lastSaved, setStatus, triggerSave, registerSaveHandler }}>
            {children}
        </SaveContext.Provider>
    );
}

export function useSaveStatus() {
    const context = useContext(SaveContext);
    if (!context) {
        throw new Error('useSaveStatus must be used within SaveStatusProvider');
    }
    return context;
}

// ==========================================
// Save Status Indicator Component
// ==========================================

interface SaveStatusIndicatorProps {
    className?: string;
    showText?: boolean;
}

export function SaveStatusIndicator({ className, showText = true }: SaveStatusIndicatorProps) {
    const { status, lastSaved, triggerSave } = useSaveStatus();

    const getStatusConfig = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    text: 'Saving...',
                    bgClass: 'bg-primary/20 border-primary/30',
                    textClass: 'text-primary',
                };
            case 'saved':
                return {
                    icon: <Check className="w-4 h-4" />,
                    text: 'Saved',
                    bgClass: 'bg-green-500/20 border-green-500/30',
                    textClass: 'text-green-400',
                };
            case 'error':
                return {
                    icon: <CloudOff className="w-4 h-4" />,
                    text: 'Save failed',
                    bgClass: 'bg-red-500/20 border-red-500/30',
                    textClass: 'text-red-400',
                };
            default:
                return {
                    icon: <Cloud className="w-4 h-4" />,
                    text: lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'All changes saved',
                    bgClass: 'bg-white/5 border-white/10',
                    textClass: 'text-gray-400',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <button
            onClick={triggerSave}
            disabled={status === 'saving'}
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300',
                'hover:scale-105 active:scale-95 disabled:hover:scale-100',
                config.bgClass,
                config.textClass,
                className
            )}
            title={status === 'error' ? 'Click to retry' : 'Click to save now'}
        >
            {config.icon}
            {showText && (
                <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {config.text}
                </span>
            )}
        </button>
    );
}

// ==========================================
// Compact version for mobile header
// ==========================================

export function SaveStatusDot() {
    const { status, triggerSave } = useSaveStatus();

    return (
        <button
            onClick={triggerSave}
            className="relative p-2 hover:bg-white/5 rounded-full transition-colors"
            title="Save status"
        >
            {status === 'saving' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : status === 'saved' ? (
                <Check className="w-4 h-4 text-green-400" />
            ) : status === 'error' ? (
                <CloudOff className="w-4 h-4 text-red-400" />
            ) : (
                <Cloud className="w-4 h-4 text-gray-400" />
            )}

            {/* Pulse animation for saving */}
            {status === 'saving' && (
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            )}
        </button>
    );
}

// ==========================================
// Helper
// ==========================================

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}
