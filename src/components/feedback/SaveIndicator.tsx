import { Loader2, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

interface SaveIndicatorProps {
    status: SaveStatus;
    lastSavedAt?: Date | null;
    className?: string;
}

export function SaveIndicator({ status, lastSavedAt, className }: SaveIndicatorProps) {
    if (status === 'unsaved') return null;

    return (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-opacity duration-300", className)}>
            {status === 'saving' ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-primary">Saving...</span>
                </>
            ) : status === 'saved' ? (
                <>
                    <Cloud className="w-3 h-3" />
                    <span>Saved {lastSavedAt ? `at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                </>
            ) : status === 'error' ? (
                <span className="text-red-400">Failed to save</span>
            ) : null}
        </div>
    );
}
