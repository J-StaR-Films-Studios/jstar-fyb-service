'use client';

import { useState, useEffect } from 'react';
import { OriginalVariant, MorphingVariant, GridVariant, HybridVariant } from './variants';

const VARIANTS = [OriginalVariant, GridVariant, HybridVariant, MorphingVariant];
const STORAGE_KEY = 'jstar_consult_variant';

/**
 * Random on first visit, sequential on refresh.
 * - No localStorage value? → Pick random (0-3), save it
 * - Has value? → Increment by 1 (mod 4), show that variant
 */
function getVariantIndex(): number {
    if (typeof window === 'undefined') return 0;

    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === null) {
        // First visit: random
        const random = Math.floor(Math.random() * VARIANTS.length);
        localStorage.setItem(STORAGE_KEY, String(random));
        return random;
    } else {
        // Subsequent visit: sequential
        const current = parseInt(stored, 10);
        const next = (current + 1) % VARIANTS.length;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
    }
}

export default function ConsultPage() {
    const [variantIndex, setVariantIndex] = useState<number | null>(null);

    useEffect(() => {
        setVariantIndex(getVariantIndex());
    }, []);

    // While loading, show nothing (or a skeleton)
    if (variantIndex === null) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const VariantComponent = VARIANTS[variantIndex];
    return <VariantComponent />;
}
