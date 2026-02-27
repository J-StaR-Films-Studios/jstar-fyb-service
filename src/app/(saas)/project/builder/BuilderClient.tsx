'use client';

import { useBuilderStore, ProjectData } from "@/features/builder/store/useBuilderStore";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TopicSelector } from "@/features/builder/components/TopicSelector";
import { AbstractGenerator } from "@/features/builder/components/AbstractGenerator";
import { ChapterOutliner } from "@/features/builder/components/ChapterOutliner";
import { Loader2 } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { mergeAnonymousData } from "@/features/bot/actions/chat";
import { usePaymentVerification } from "@/features/builder/hooks/usePaymentVerification";
import { BuilderBottomNav } from "@/features/builder/components/BuilderBottomNav";
import { FloatingChatFAB } from "@/features/builder/components/FloatingChatFAB";
import { FloatingResearchPanel } from "@/features/builder/components/FloatingResearchPanel";
import { ProgressStepper } from "@/features/builder/components/ProgressStepper";
import { useBuilderLayout } from "@/features/builder/context/BuilderLayoutContext";

interface BuilderClientProps {
    serverProject?: Partial<ProjectData> | null;
    serverIsPaid?: boolean;
    serverIsReferred?: boolean;
}

export function BuilderClient({ serverProject, serverIsPaid = false, serverIsReferred = false }: BuilderClientProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const { step, updateData, syncWithUser, hydrateFromChat, loadProject, isPaid, unlockPaywall, data: storeData } = useBuilderStore();
    const searchParams = useSearchParams();
    const { } = useBuilderLayout();

    // CRITICAL: Track local hydration state to prevent rendering with stale data
    const [isHydrated, setIsHydrated] = useState(false);

    // CRITICAL: Run payment verification at the TOP LEVEL so it runs on ALL steps, not just OUTLINE
    const { isVerifying } = usePaymentVerification(isPaid, unlockPaywall);

    // Scroll to top on mount to prevent starting at upgrade section
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // ========== CONSOLIDATED HYDRATION LOGIC ==========
    // This single effect handles all state hydration in the correct order to prevent race conditions.
    // Priority: Server Data > Chat Handoff > localStorage (zustand persist handles this passively)
    useEffect(() => {
        // Wait for auth to resolve before doing anything
        if (isPending) return;

        // 🔧 FIX: Reset hasServerHydrated to allow fresh data on each navigation/tab
        // This ensures that server data (especially isPaid) can always override stale localStorage
        useBuilderStore.setState({ hasServerHydrated: false });

        // STEP 1: Check for Fresh Chat Handoff (Top Priority)
        // If a new handoff exists (e.g. user just clicked "Build"), it overrides any existing server draft
        // UNLESS the server draft is PAID and matches the handoff (Prevent Downgrade)
        const hasFreshHandoff = hydrateFromChat(session?.user?.id, serverProject, serverIsPaid);

        if (hasFreshHandoff) {
            console.log('[BuilderClient] Fresh chat handoff applied. Skipping server load.');
            // Mark as hydrated even for handoff case
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsHydrated(true);
            return;
        }

        // STEP 2: Load server project if available (Secondary Priority)
        // Only if no fresh handoff occurred
        if (serverProject) {
            loadProject(serverProject, serverIsPaid);
            console.log('[BuilderClient] Hydrated from server', { projectId: serverProject.projectId, isPaid: serverIsPaid });
        }

        // STEP 3: Sync with current user (only runs destructive reset on actual logout/account-switch)
        syncWithUser(session?.user?.id || null);

        // CRITICAL: Mark hydration complete AFTER all state updates

        setIsHydrated(true);

    }, [isPending, serverProject, serverIsPaid, session?.user?.id, loadProject, syncWithUser, hydrateFromChat]);

    // Handle Global Save Shortcut (Ctrl+S)
    useEffect(() => {
        const handleSaveShortcut = () => {
            // In a real app, this might trigger an immediate API sync
            // For now, we show visual feedback since local persistence is instant
            useBuilderStore.getState().setSaveStatus('saving');
            setTimeout(() => {
                useBuilderStore.getState().setSaveStatus('saved');
            }, 800);
        };

        window.addEventListener('jstar:save', handleSaveShortcut);
        return () => window.removeEventListener('jstar:save', handleSaveShortcut);
    }, []);

    // 1. Auth Guard: Redirect to Login if not authenticated
    useEffect(() => {
        if (!isPending && !session) {
            const params = searchParams.toString();
            const callbackUrl = params ? `/project/builder?${params}` : '/project/builder';
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }
    }, [isPending, session, searchParams, router]);

    useEffect(() => {
        if (!isPending && session?.user?.id) {
            const anonymousId = localStorage.getItem("jstar_anonymous_id");
            if (anonymousId) {
                mergeAnonymousData(anonymousId, session.user.id).then(() => {
                    localStorage.removeItem("jstar_anonymous_id");
                });
            }
        }
    }, [session?.user?.id, isPending]);

    useEffect(() => {
        const topic = searchParams.get('topic');
        const twist = searchParams.get('twist');
        if (topic && twist) updateData({ topic, twist });
    }, [searchParams, updateData]);

    // ========== HYDRATION LOADING STATE ==========
    // Block rendering of main content until hydration is complete to prevent stale data issues
    if (!isHydrated || isPending) {
        return (
            <div className="w-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading your project...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="w-full relative">
            {/* Ambient Background Blobs */}
            <div className="fixed rounded-full blur-[100px] z-[-1] opacity-30 pointer-events-none bg-purple-900/40 w-96 h-96 top-0 -left-20" aria-hidden="true" />
            <div className="fixed rounded-full blur-[100px] z-[-1] opacity-30 pointer-events-none bg-blue-900/20 w-[500px] h-[500px] bottom-0 -right-20" aria-hidden="true" />

            {/* Payment Verification Loading Overlay */}
            {isVerifying && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-white font-bold text-lg">Verifying Payment...</p>
                        <p className="text-gray-400 text-sm">Please wait while we confirm your payment.</p>
                    </div>
                </div>
            )}

            {/* Progress Section */}
            <div id="progress-header" className="mb-6 relative z-10 transition-all duration-500 max-w-7xl mx-auto px-4 w-full pt-20">
                <ProgressStepper />
            </div>

            {/* Main Content Area - with enhanced step transitions */}
            <main className="relative px-4 md:px-8 max-w-7xl mx-auto min-h-screen flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 'TOPIC' && (
                        <motion.div
                            key="topic"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <TopicSelector />
                        </motion.div>
                    )}

                    {step === 'ABSTRACT' && (
                        <motion.div
                            key="abstract"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <AbstractGenerator />
                        </motion.div>
                    )}

                    {step === 'OUTLINE' && (
                        <motion.div
                            key="outline"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <ChapterOutliner isReferred={serverIsReferred} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Builder Mobile Bottom Navigation - 4 tabs + center FAB */}
            <BuilderBottomNav />

            {/* Floating Chat FAB - Gradient button linking to /hub */}
            <FloatingChatFAB />

            {/* Floating Research Panel - Research panel for the builder */}
            <FloatingResearchPanel />
        </div>
    );
}
