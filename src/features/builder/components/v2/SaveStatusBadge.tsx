import { Cloud, Loader2, Check, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface SaveStatusBadgeProps {
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    lastSavedAt: Date | null;
    onSave: () => void;
    showText?: boolean;
}

export const SaveStatusBadge = React.memo(({ saveStatus, lastSavedAt, onSave, showText = true }: SaveStatusBadgeProps) => {
    const config = {
        idle: { icon: <Cloud className="w-4 h-4" />, text: lastSavedAt ? 'Saved' : 'Ready', className: 'text-gray-400 bg-white/5' },
        saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', className: 'text-primary bg-primary/20' },
        saved: { icon: <Check className="w-4 h-4" />, text: 'Saved!', className: 'text-green-400 bg-green-500/20' },
        error: { icon: <CloudOff className="w-4 h-4" />, text: 'Failed', className: 'text-red-400 bg-red-500/20' },
    }[saveStatus];

    return (
        <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 transition-all duration-300',
                'hover:scale-105 active:scale-95 disabled:hover:scale-100',
                config.className
            )}
            title={saveStatus === 'error' ? 'Click to retry' : 'Click to save now'}
        >
            {config.icon}
            {showText && (
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    {config.text}
                </span>
            )}
        </button>
    );
});

SaveStatusBadge.displayName = 'SaveStatusBadge';
