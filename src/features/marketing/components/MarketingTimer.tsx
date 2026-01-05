'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface MarketingTimerProps {
    startDate: Date | null;
    targetDate: Date | null;
}

export function MarketingTimer({ startDate, targetDate }: MarketingTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const [isRushing, setIsRushing] = useState(true);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!startDate || !targetDate) return;

        const start = startDate.getTime();
        const end = targetDate.getTime();
        const now = Date.now();

        // If expired
        if (now >= end) {
            setIsRushing(false);
            return;
        }

        // Animation duration in ms
        const RUSH_DURATION = 2500;

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min(elapsed / RUSH_DURATION, 1);

            // Easing function for "brakes" effect (easeOutExpo)
            const ease = (x: number) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
            const easedProgress = ease(progress);

            // Virtual "current time" moves from start -> now
            // We want to display the time REMAINING regarding that virtual current time.
            // At progress 0: virtualTime = start. Display = end - start = totalDuration
            // At progress 1: virtualTime = now. Display = end - now = realRemaining

            const virtualTime = start + (now - start) * easedProgress;
            const remaining = Math.max(0, end - virtualTime);

            const d = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const h = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((remaining % (1000 * 60)) / 1000);

            setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsRushing(false);
            }
        };

        requestAnimationFrame(animate);

    }, [startDate, targetDate]);

    // Regular interval after rushing
    useEffect(() => {
        if (!targetDate || isRushing) return;

        const tick = () => {
            const now = Date.now();
            const end = targetDate.getTime();
            const remaining = Math.max(0, end - now);

            const d = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const h = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((remaining % (1000 * 60)) / 1000);

            setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
        };

        const interval = setInterval(tick, 1000);
        tick(); // immediate

        return () => clearInterval(interval);
    }, [targetDate, isRushing]);

    if (!startDate || !targetDate) return null;

    // Don't show if already expired significantly? Or show 00:00:00?
    // User asked for "rush down", so presumably they want to see it even if close.
    // We'll just show 0s if expired.

    return (
        <div className="flex gap-2 md:gap-4 my-8 justify-center">
            <TimerBlock value={timeLeft.days} label="DAYS" />
            <span className="text-2xl md:text-4xl font-bold text-white/20 mt-2">:</span>
            <TimerBlock value={timeLeft.hours} label="HRS" />
            <span className="text-2xl md:text-4xl font-bold text-white/20 mt-2">:</span>
            <TimerBlock value={timeLeft.minutes} label="MINS" />
            <span className="text-2xl md:text-4xl font-bold text-white/20 mt-2">:</span>
            <TimerBlock value={timeLeft.seconds} label="SECS" highlight />
        </div>
    );
}

function TimerBlock({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
    // Format with leading zero
    const formatted = value.toString().padStart(2, '0');

    return (
        <div className="flex flex-col items-center">
            <div className={cn(
                "bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4 min-w-[70px] md:min-w-[100px] flex items-center justify-center shadow-2xl relative overflow-hidden group",
                highlight && "border-primary/50 bg-primary/5"
            )}>
                {/* Glow effect */}
                {highlight && (
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                )}

                <span className={cn(
                    "text-2xl md:text-5xl font-mono font-bold tracking-tighter relative z-10",
                    highlight ? "text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" : "text-white"
                )}>
                    {formatted}
                </span>
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-500 mt-2 tracking-widest">{label}</span>
        </div>
    );
}
