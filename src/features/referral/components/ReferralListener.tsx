'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const REFERRAL_STORAGE_KEY = 'jstar_pending_referral_code';

export function ReferralListener() {
    const { data: session } = useSession();
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        // Only run if we have a session and haven't checked yet
        if (!session?.user || hasCheckedRef.current) return;

        const pendingCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (!pendingCode) return;

        const processReferral = async () => {
            hasCheckedRef.current = true; // Prevent double firing

            // Should we check if user already has referrer? 
            // The API handles that check, so just try to link.
            try {
                // logger.info is removed to avoid spam, or we can log it if strictly needed.
                // console.log('[ReferralListener] found pending code:', pendingCode);

                const res = await fetch('/api/referral/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: pendingCode })
                });

                if (res.ok) {
                    toast.success("Referral code applied successfully!");
                    localStorage.removeItem(REFERRAL_STORAGE_KEY);
                } else {
                    const data = await res.json();
                    // If error is "already linked", that's fine, just clear it.
                    // If invalid code, maybe warn?
                    logger.warn(`[ReferralListener] Failed to link: ${data.error}`);

                    // If user is already linked, clear the code so we don't retry forever
                    if (data.error?.includes('already linked')) {
                        localStorage.removeItem(REFERRAL_STORAGE_KEY);
                    }
                    // For invalid codes, maybe keep it? Or clear it to avoid annoyance?
                    // Better to clear it.
                    localStorage.removeItem(REFERRAL_STORAGE_KEY);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                logger.error(`[ReferralListener] Error processing referral: ${errorMessage}`);
                // Don't clear on network error, retry next time
            }
        };

        processReferral();

    }, [session]);

    return null; // Renderless component
}
