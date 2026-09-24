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
        idle: { icon: <Cloud className="w-4 h-4" />, text: lastSavedAt ? 'Saved' : 'Ready', className: 'text-ink-muted bg-writing' },
        saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Saving...', className: 'text-ink bg-selection' },
        saved: { icon: <Check className="w-4 h-4" />, text: 'Saved!', className: 'text-ink bg-selection' },
        error: { icon: <CloudOff className="w-4 h-4" />, text: 'Failed', className: 'text-ink bg-writing' },
    }[saveStatus];

    return (
        <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md border border-rule min-h-11 transition-all duration-300',
                'hover:bg-selection focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-rust',
                config.className
            )}
            title={saveStatus === 'error' ? 'Click to retry' : 'Click to save now'}
        >
            {config.icon}
            {showText && (
                <span className="text-xs font-bold uppercase tracking-wider">
                    {config.text}
                </span>
            )}
        </button>
    );
});

SaveStatusBadge.displayName = 'SaveStatusBadge';
