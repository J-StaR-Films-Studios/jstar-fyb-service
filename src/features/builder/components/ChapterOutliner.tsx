'use client';

import { useBuilderStore } from "@/features/builder/store/useBuilderStore";
import { useEffect, useRef } from "react";
import { Check, Loader2, RefreshCw, FileText } from "lucide-react";
import { toast } from 'sonner';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { outlineSchema, Chapter } from '../schemas/outlineSchema';
import { PricingOverlay } from "@/features/builder/components/PricingOverlay";
import { QuickActions } from "./QuickActions";
import { ModeSelection } from "./ModeSelection";
import { ConciergeWaiting } from "./ConciergeWaiting";
import { ChapterGenerator } from "./ChapterGenerator";
import { UpsellBridge } from "./UpsellBridge";
import { OutlinePreview } from "./OutlinePreview";
import { ResearchSourcesCard } from "./ResearchSourcesCard";
import { usePaymentVerification } from "../hooks/usePaymentVerification";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopicLockModal } from "@/features/billing/components/TopicLockModal";
import { TopicChangeWarningModal } from "./TopicChangeWarningModal";
import { AbstractEditorModal } from "./AbstractEditorModal";
import { TopicResetWarningModal } from "./TopicResetWarningModal";

// Animation variants for staggered fade-in
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1] as const // easeOut cubic-bezier
        }
    }
};

export function ChapterOutliner({ isReferred }: { isReferred?: boolean }) {
    const { data, isPaid, unlockPaywall, updateData, setMode } = useBuilderStore();
    const hasSubmittedRef = useRef(false);
    const { data: session } = useSession();
    const router = useRouter();

    // Payment verification hook (handles ?reference= URL param)
    const { isVerifying } = usePaymentVerification(isPaid, unlockPaywall);

    // Lock Warning Logic
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);

    // Topic Change Warning Logic (for recently unlocked projects)
    // Detect: project is unlocked (isLocked=false) AND isPaid AND has no abstract
    // This combination means admin approved a topic switch and content was cleared
    const wasRecentlyUnlocked = isPaid && !data.isLocked && !data.abstract && data.topic;
    const [showTopicChangeWarning, setShowTopicChangeWarning] = useState(false);
    const hasShownWarningRef = useRef(false);

    // New modal state for user-initiated topic/abstract changes
    const [showAbstractEditor, setShowAbstractEditor] = useState(false);
    const [showTopicResetWarning, setShowTopicResetWarning] = useState(false);

    // Determine which button to show based on project state
    const isProjectLocked = isPaid && data.isLocked;

    // Show warning modal on mount if project is in "recently unlocked" state
    useEffect(() => {
        if (wasRecentlyUnlocked && !hasShownWarningRef.current) {
            hasShownWarningRef.current = true;
            const timer = window.setTimeout(() => {
                setShowTopicChangeWarning(true);
            }, 0);

            return () => window.clearTimeout(timer);
        }
    }, [wasRecentlyUnlocked]);

    // Initial Trigger (opens modal)
    const handleUnlock = () => {
        setIsLockModalOpen(true);
    };

    // Actual Payment (after confirmation)
    const proceedToPayment = async (discountCode?: string) => {
        setIsLockModalOpen(false); // Close modal

        if (!data.projectId) {
            console.error('[ChapterOutliner] No projectId for unlock');
            return;
        }

        // Enforce Auth BEFORE Payment/Unlock
        if (!session) {
            router.push('/auth/register?callbackUrl=/project/builder');
            return;
        }

        try {
            const res = await fetch('/api/pay/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: data.projectId,
                    discountCode: typeof discountCode === 'string' ? discountCode : undefined
                })
            });

            const result = await res.json();

            if (result.url) {
                window.location.href = result.url;
            } else {
                toast.error(result.error || "Failed to initialize payment. Please try again.");
            }
        } catch (error) {
            console.error('[ChapterOutliner] Failed to init payment:', error);
            toast.error("Connection error. Please try again.");
        }
    };

    const { object, submit, isLoading, error } = useObject({
        api: '/api/generate/outline',
        schema: outlineSchema,
        onFinish: ({ object }) => {
            if (object?.chapters) {
                // CRITICAL FIX: Convert to proper array format
                // useObject can return {0: {...}, 1: {...}} instead of [{...}, {...}]
                // This happens during streaming - we need to normalize it
                const rawChapters = object.chapters;
                const newOutline = (Array.isArray(rawChapters)
                    ? rawChapters
                    : Object.values(rawChapters)) as Chapter[];

                updateData({ outline: newOutline });

                // Auto-save to DB
                if (data.projectId) {
                    fetch(`/api/projects/${data.projectId}/outline`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ outline: newOutline })
                    }).then(res => {
                        if (res.ok) console.log('[ChapterOutliner] Auto-saved outline to DB');
                        else console.error('[ChapterOutliner] Failed to auto-save outline');
                    });
                }
            }
        },
        onError: (err) => {
            console.error('[ChapterOutliner] Generation error:', err);
        }
    });

    // Use streamed chapters immediately
    const streamedChapters = object?.chapters || [];
    const displayChapters = streamedChapters.length > 0 ? streamedChapters : (data.outline || []);
    const displayTitle = object?.title || data.topic || "Project Title";
    const abstractPreview = data.abstract || "Loading abstract...";
    const isStreaming = isLoading;

    // Fetch stored outline if we have a project ID and no outline yet
    useEffect(() => {
        const fetchStoredOutline = async () => {
            if (data.projectId && !data.outline?.length && !isLoading) {
                try {
                    const response = await fetch(`/api/projects/${data.projectId}/outline`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.outline) {
                            updateData({ outline: result.outline });
                        }
                    }
                } catch (error) {
                    console.error('[ChapterOutliner] Failed to fetch stored outline:', error);
                }
            }
        };
        fetchStoredOutline();
    }, [data.projectId, data.outline?.length, isLoading, updateData]);

    // Trigger generation automatically if we have topic/abstract but no outline yet
    useEffect(() => {
        if (data.abstract && data.topic && !hasSubmittedRef.current && !data.outline?.length && !isLoading) {
            hasSubmittedRef.current = true;
            console.log('[ChapterOutliner] Generating free outline...');
            submit({ topic: data.topic, abstract: data.abstract, projectId: data.projectId });
        }
    }, [data.abstract, data.topic, data.outline?.length, data.projectId, submit, isLoading]);

    // Project claiming logic (Lazy Auth)
    useEffect(() => {
        const claimProject = async () => {
            if (session?.user && data.projectId) {
                try {
                    const res = await fetch(`/api/projects/${data.projectId}/claim`, { method: 'POST' });
                    if (res.ok) {
                        console.log('[ChapterOutliner] Project claimed successfully');
                    }
                } catch (e) {
                    console.warn('[ChapterOutliner] Failed to claim project', e);
                }
            }
        };
        claimProject();
    }, [session?.user, data.projectId]);

    const handleRetry = () => {
        hasSubmittedRef.current = false;
        submit({ topic: data.topic, abstract: data.abstract, projectId: data.projectId });
    };

    // Verify Loading State
    if (isVerifying) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h2>
                <p className="text-gray-400">Please wait while we confirm your transaction.</p>
            </div>
        );
    }

    // Error state (only after payment)
    if (isPaid && error && (!object?.chapters || object.chapters.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="text-red-500 mb-4 text-center">
                    <p className="font-bold">Generation Failed</p>
                    <p className="text-sm text-gray-400 mt-1">Something went wrong. Please try again.</p>
                </div>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/40 rounded-xl text-primary hover:bg-primary/30 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Generation
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Success State Header - with fade-in animation */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-10"
            >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 mb-4 border border-green-500/20">
                    {isLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <Check className="w-8 h-8" />
                    )}
                </div>
                <h1 className="text-3xl font-display font-bold mb-2">
                    {isLoading ? 'Generating Your Project...' : 'Structure Generated'}
                </h1>
                <p className="text-gray-400">
                    {isLoading
                        ? 'AI is crafting your distinction-grade outline...'
                        : "We've crafted a distinction-grade abstract and outline for your project."}
                </p>

                {/* Navigation Recovery: Conditional button based on lock state */}
                {!isLoading && (
                    isProjectLocked ? (
                        <button
                            onClick={() => setShowAbstractEditor(true)}
                            className="mt-4 text-xs text-primary hover:text-white flex items-center gap-1 transition-colors mx-auto"
                        >
                            <FileText className="w-3 h-3" />
                            Edit Abstract
                        </button>
                    ) : (
                        <button
                            onClick={() => isPaid ? setShowTopicResetWarning(true) : setShowTopicResetWarning(true)}
                            className="mt-4 text-xs text-gray-500 hover:text-white underline transition-colors mx-auto"
                        >
                            Change Topic
                        </button>
                    )
                )}
            </motion.div>

            {/* The Content - with staggered animations and safe bottom padding for mobile nav */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative pb-20 md:pb-6"
            >
                {/* Outline Preview - Always visible */}
                <motion.div variants={itemVariants}>
                    <OutlinePreview
                        displayTitle={displayTitle}
                        abstractPreview={abstractPreview}
                        displayChapters={displayChapters}
                        isStreaming={isStreaming}
                    />
                </motion.div>

                {/* State-Based Rendering */}
                {!isPaid ? (
                    /* LOCKED STATE: Paywall */
                    <motion.div variants={itemVariants} className="mt-8">
                        <PricingOverlay onUnlock={handleUnlock} />
                    </motion.div>
                ) : data.mode === null ? (
                    /* MODE SELECTION STATE */
                    <motion.div variants={itemVariants} className="mt-16">
                        <ModeSelection
                            projectId={data.projectId!}
                            onModeSelected={(mode) => setMode(mode)}
                        />
                    </motion.div>
                ) : data.mode === "CONCIERGE" ? (
                    /* CONCIERGE MODE STATE */
                    <motion.div variants={itemVariants} className="mt-16">
                        <ConciergeWaiting projectId={data.projectId!} status={data.status} />
                    </motion.div>
                ) : (
                    /* UNLOCKED DIY STATE: Full builder experience */
                    <>
                        {/* Chapter Generator - PRIMARY ACTION */}
                        {data.projectId && (
                            <motion.div variants={itemVariants} className="mt-16">
                                <ChapterGenerator projectId={data.projectId} />
                            </motion.div>
                        )}

                        {/* Secondary Actions Grid - 2 columns on desktop, 1 on mobile */}
                        <motion.div variants={itemVariants} className="mt-16">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Research Sources Card */}
                                <ResearchSourcesCard />

                                {/* Quick Actions */}
                                <QuickActions projectId={data.projectId!} />
                            </div>
                        </motion.div>

                        {/* Document Upload - Moved to FloatingResearchPanel */}

                        {/* Upsell Bridge - Preserved at bottom */}
                        <motion.div variants={itemVariants} className="mt-20 mb-10">
                            <UpsellBridge projectId={data.projectId} />
                        </motion.div>
                    </>
                )}
            </motion.div>

            {isLockModalOpen ? (
                <TopicLockModal
                    isOpen={isLockModalOpen}
                    onClose={() => setIsLockModalOpen(false)}
                    onConfirm={proceedToPayment}
                    topic={data.topic || "Your Project"}
                    isReferred={isReferred}
                />
            ) : null}

            {/* Topic Change Warning Modal - shown when project was unlocked for topic switch */}
            <TopicChangeWarningModal
                isOpen={showTopicChangeWarning}
                projectTopic={data.topic || "Your Project"}
                onProceed={() => {
                    setShowTopicChangeWarning(false);
                    // Go to TOPIC step to let user pick a new topic
                    useBuilderStore.setState({ step: 'TOPIC' });
                }}
                onCancel={() => {
                    setShowTopicChangeWarning(false);
                    router.push('/dashboard');
                }}
            />

            {/* Abstract Editor Modal - for locked projects */}
            {data.projectId && (
                <AbstractEditorModal
                    isOpen={showAbstractEditor}
                    onClose={() => setShowAbstractEditor(false)}
                    projectId={data.projectId}
                    initialAbstract={data.abstract || ""}
                />
            )}

            {/* Topic Reset Warning Modal - for unpaid/unlocked projects changing topic */}
            <TopicResetWarningModal
                isOpen={showTopicResetWarning}
                onClose={() => setShowTopicResetWarning(false)}
                currentTopic={data.topic || "Your Project"}
                projectId={data.projectId}
                topicSwitchCount={data.topicSwitchCount || 0}
            />
        </>
    );
}

