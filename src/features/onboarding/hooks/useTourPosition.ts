import { useState, useEffect } from 'react';

export const useTourPosition = (targetId: string) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const updateRect = () => {
            if (!targetId) return;
            const element = document.getElementById(targetId);
            if (element) {
                setRect(element.getBoundingClientRect());
                // Ensure element is in view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setRect(null);
            }
        };

        // Initial check
        updateRect();

        // Poll for element presence (in case of dynamic loading)
        const interval = setInterval(updateRect, 500);

        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [targetId]);

    return rect;
};
