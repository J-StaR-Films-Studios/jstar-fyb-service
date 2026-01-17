import { useEffect, useState, useRef } from 'react';

export function usePullToRefresh(ref: React.RefObject<HTMLElement>, onRefresh: () => Promise<void>) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (element.scrollTop <= 0) {
                startY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const y = e.touches[0].clientY;
            const pull = y - startY.current;
            
            // Simple logic: if pulling down at top, prevent default to avoid native refresh
            // if we want to handle it ourselves
            if (pull > 0 && element.scrollTop <= 0 && e.cancelable) {
                 // e.preventDefault(); // Optional: block native scroll if needed
            }
        };

        const handleTouchEnd = async (e: TouchEvent) => {
            const y = e.changedTouches[0].clientY;
            const pull = y - startY.current;
            
            if (pull > 100 && element.scrollTop <= 0 && !isRefreshing) {
                setIsRefreshing(true);
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                }
            }
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [ref, onRefresh, isRefreshing]);

    return { isRefreshing };
}
