'use client';

import { useEffect, useState } from 'react';

interface MarketingTimerProps { startDate: Date | null; targetDate: Date | null }

export function MarketingTimer({ startDate, targetDate }: MarketingTimerProps) {
    const [remaining, setRemaining] = useState<number | null>(null);
    useEffect(() => {
        if (!startDate || !targetDate) return;
        const tick = () => setRemaining(Math.max(0, targetDate.getTime() - Date.now()));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [startDate, targetDate]);
    if (!startDate || !targetDate) return null;
    const seconds = Math.floor((remaining ?? 0) / 1000);
    const blocks = [
        { label: 'Days', value: Math.floor(seconds / 86400) },
        { label: 'Hours', value: Math.floor((seconds % 86400) / 3600) },
        { label: 'Minutes', value: Math.floor((seconds % 3600) / 60) },
        { label: 'Seconds', value: seconds % 60 },
    ];
    return <div className="mx-auto mt-5 flex max-w-md justify-center gap-2 sm:gap-4" role="timer" aria-label="Time remaining on current offer">
        {blocks.map(block => <div key={block.label} className="min-w-0 flex-1 rounded-md border border-rule bg-writing p-2 text-center sm:p-3">
            <span className="block font-margin-mono text-xl font-semibold text-ink sm:text-3xl">{remaining === null ? '–' : String(block.value).padStart(2, '0')}</span>
            <span className="mt-1 block text-xs text-ink-muted">{block.label}</span>
        </div>)}
    </div>;
}
