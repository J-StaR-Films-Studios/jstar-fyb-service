'use client';

import { useBuilderStore, ProjectData } from "@/features/builder/store/useBuilderStore";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TopicSelector } from "@/features/builder/components/TopicSelector";
import { AbstractGenerator } from "@/features/builder/components/AbstractGenerator";
import { ChapterOutliner } from "@/features/builder/components/ChapterOutliner";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSession } from "@/lib/auth-client";
import { mergeAnonymousData } from "@/features/bot/actions/chat";
import { usePaymentVerification } from "@/features/builder/hooks/usePaymentVerification";

interface BuilderClientProps {
    serverProject?: Partial<ProjectData> | null;
    serverIsPaid?: boolean;
    serverIsReferred?: boolean;
}

const STEPS = [
    { id: 'TOPIC', label: 'Concept' },
    { id: 'ABSTRACT', label: 'Strategy' },
    { id: 'OUTLINE', label: 'Blueprint' }
];

export function BuilderClient({ serverProject, serverIsPaid = false, serverIsReferred = false }: BuilderClientProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const { step, updateData, syncWithUser, hydrateFromChat, loadProject, isPaid, unlockPaywall } = useBuilderStore();
    const searchParams = useSearchParams();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Helper to determine step index
    const getStepIndex = () => ['TOPIC', 'ABSTRACT', 'OUTLINE'].indexOf(step);

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
        <div className="w-full">
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
            {/* Progress Toolbar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="font-display font-bold text-2xl text-white">Project Builder</h2>
                </div>

                {/* Steps Progress */}
                <div className="relative flex justify-between items-center mb-8 px-4 max-w-2xl mx-auto">
                    {/* Connecting Line */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10 -z-10" />
                    <div
                        className="absolute top-4 left-0 h-0.5 bg-primary -z-10 transition-all duration-500"
                        style={{ width: `${(getStepIndex() / 2) * 100}%` }}
                    />

                    {STEPS.map((s, i) => {
                        const currentIndex = getStepIndex();
                        const isCompleted = currentIndex > i;
                        const isActive = currentIndex === i;

                        return (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-dark px-2 z-10">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                                    isActive ? "border-primary text-primary shadow-[0_0_15px_rgba(139,92,246,0.5)] bg-dark" :
                                        isCompleted ? "border-primary bg-primary text-white" :
                                            "border-white/10 text-gray-500 bg-dark"
                                )}>
                                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium uppercase tracking-wider transition-colors duration-300",
                                    isActive ? "text-primary" :
                                        isCompleted ? "text-white" :
                                            "text-gray-600"
                                )}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="relative">
                <AnimatePresence mode="wait">
                    {step === 'TOPIC' && (
                        <motion.div
                            key="topic"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
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
                        >
                            <ChapterOutliner isReferred={serverIsReferred} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
