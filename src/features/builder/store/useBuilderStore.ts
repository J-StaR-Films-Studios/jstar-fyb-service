import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Chapter } from '../schemas/outlineSchema';

/**
 * IMPORTANT: State Hydration Priority
 * 
 * This store uses Zustand's persist middleware with localStorage.
 * The hydration order is CRITICAL to prevent race conditions:
 * 
 * 1. Zustand instantly hydrates `data` from localStorage (SYNC)
 * 2. Server component fetches fresh data from DB (ASYNC)
 * 3. BuilderClient.tsx calls loadProject() with server data
 * 
 * The `hasServerHydrated` flag prevents localStorage from overwriting
 * server data AFTER loadProject() is called. It is reset on each
 * navigation in BuilderClient.tsx to allow fresh data.
 * 
 * NEVER persist `isPaid` to localStorage - server is ALWAYS source of truth.
 */

export type BuilderStep = 'TOPIC' | 'ABSTRACT' | 'OUTLINE' | 'PAYWALL';
export type ProjectMode = 'DIY' | 'CONCIERGE' | null;
export type ProjectStatus = 'OUTLINE_GENERATED' | 'RESEARCH_IN_PROGRESS' | 'RESEARCH_COMPLETE' | 'WRITING_IN_PROGRESS' | 'PROJECT_COMPLETE';

// Re-export for consumers
export type { Chapter };

export interface ProjectData {
    userId: string | null;
    projectId: string | null;
    topic: string;
    twist: string;
    abstract: string;
    outline: Chapter[];
    mode: ProjectMode;
    status: ProjectStatus;
    isLocked?: boolean;
    topicSwitchCount?: number;
}

interface BuilderState {
    step: BuilderStep;
    data: ProjectData;
    isGenerating: boolean;
    isPaid: boolean;
    isFromChat: boolean;
    hasServerHydrated: boolean; // Prevents localStorage from overwriting server data

    setStep: (step: BuilderStep) => void;
    updateData: (data: Partial<ProjectData>) => void;
    setGenerating: (isGenerating: boolean) => void;
    unlockPaywall: () => void;
    setMode: (mode: ProjectMode) => void;
    hydrateFromChat: (userId?: string | null, existingProject?: Partial<ProjectData> | null, existingIsPaid?: boolean) => boolean;
    clearChatData: () => void;
    syncWithUser: (userId: string | null) => void;
    loadProject: (data: Partial<ProjectData>, isPaid?: boolean) => void;
}

const CHAT_HANDOFF_KEY = 'jstar_confirmed_topic';

export const useBuilderStore = create<BuilderState>()(
    persist(
        (set, get) => ({
            step: 'TOPIC',
            data: {
                userId: null,
                projectId: null,
                topic: '',
                twist: '',
                abstract: '',
                outline: [],
                mode: null,
                status: 'OUTLINE_GENERATED',
                isLocked: false
            },
            isGenerating: false,
            isPaid: false,
            isFromChat: false,
            hasServerHydrated: false,

            setStep: (step) => set({ step }),
            updateData: (newData) => set((state) => ({
                data: { ...state.data, ...newData }
            })),
            setGenerating: (isGenerating) => set({ isGenerating }),
            unlockPaywall: () => set({ isPaid: true }),
            setMode: (mode) => set((state) => ({
                data: { ...state.data, mode }
            })),

            // Hydrate topic/twist from localStorage (set by chat handoff)
            hydrateFromChat: (currentUserId, existingProject, existingIsPaid) => {
                if (typeof window === 'undefined') return false;

                // Don't overwrite if server already hydrated
                if (get().hasServerHydrated) {
                    console.log('[Builder] Server already hydrated, skipping chat hydration');
                    return false;
                }

                const stored = localStorage.getItem(CHAT_HANDOFF_KEY);
                if (!stored) return false;

                try {
                    const { topic, twist, confirmedAt, userId: handoffUserId } = JSON.parse(stored);

                    // Check if data belongs to current user
                    if (currentUserId && handoffUserId && currentUserId !== handoffUserId) {
                        console.warn('[Builder] Handoff data mismatch (different user)');
                        localStorage.removeItem(CHAT_HANDOFF_KEY);
                        return false;
                    }

                    // Check if data is stale (older than 24 hours)
                    const confirmedDate = new Date(confirmedAt);
                    const now = new Date();
                    const hoursOld = (now.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60);
                    if (hoursOld > 24) {
                        localStorage.removeItem(CHAT_HANDOFF_KEY);
                        return false;
                    }

                    // CRITICAL FIX: Prevent downgrading a Paid Project
                    // If the server project is PAID, NEVER let a chat handoff overwrite it automatically.
                    // Prior logic checked for topic match, but string mismatches caused accidental resets.
                    if (existingIsPaid) {
                        console.log('[Builder] Server project is PAID. Ignoring chat handoff to prevent downgrade.', {
                            serverTopic: existingProject?.topic,
                            handoffTopic: topic
                        });
                        // We safely remove the handoff key because the user is clearly engaged with a paid project
                        localStorage.removeItem(CHAT_HANDOFF_KEY);
                        return false;
                    }

                    // LOGIC CHANGE: If handoff is VERY fresh (< 5 mins), valid user intent overrides server state
                    const minutesOld = hoursOld * 60;
                    const isFreshHandoff = minutesOld < 5;

                    // If it's a fresh handoff, we prioritize it even if server data exists (UNLESS it was paid above)
                    if (isFreshHandoff) {
                        console.log('[Builder] Fresh handoff detected, overriding server data', { minutesOld });
                        // ... (rest of logic)
                        set({
                            data: {
                                ...get().data, // Keep valid fields like userId
                                topic,
                                twist: twist || '',
                                abstract: '', // Reset derivative fields
                                outline: [],
                                projectId: null, // Reset ID to ensure new project creation
                                status: 'OUTLINE_GENERATED' // Reset status
                            },
                            step: 'TOPIC', // Reset step to confirm topic
                            isFromChat: true,
                            isPaid: false // Reset payment status for new flow
                        });
                        // Clear the key immediately after consuming to prevent loop on refresh
                        localStorage.removeItem(CHAT_HANDOFF_KEY);
                        return true;
                    }

                    // Standard hydration (only if empty)
                    if (!get().data.topic) {
                        set({
                            data: { ...get().data, topic, twist: twist || '', userId: currentUserId || null },
                            isFromChat: true
                        });
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.error('[Builder] Failed to parse chat handoff data:', e);
                    localStorage.removeItem(CHAT_HANDOFF_KEY);
                    return false;
                }
            },

            // Clear chat handoff data and reset form
            clearChatData: () => {
                localStorage.removeItem(CHAT_HANDOFF_KEY);
                set({
                    data: { userId: get().data.userId, projectId: null, topic: '', twist: '', abstract: '', outline: [], mode: null, status: 'OUTLINE_GENERATED' },
                    isFromChat: false,
                    step: 'TOPIC'
                });
            },

            // Sync state with current authenticated user
            syncWithUser: (userId) => {
                const { data: currentData, hasServerHydrated } = get();

                // If server has already hydrated, don't let localStorage-based logic overwrite
                if (hasServerHydrated) {
                    console.log('[Builder] Server already hydrated, skipping syncWithUser reset');
                    return;
                }

                // CASE 1: Transitioning from Anonymous to Authenticated
                // If we have valid generated content but no user owner, allow the new user to claim it
                if (currentData.userId === null && userId !== null && currentData.topic) {
                    console.log('[Builder] Claiming anonymous session data for user', userId);
                    set((state) => ({
                        data: { ...state.data, userId }
                    }));
                    return;
                }

                // CASE 2: Explicit logout (userId becomes null from a valid user)
                // Only reset if we're actually logging out, not on initial load from localStorage
                if (currentData.userId !== null && userId === null) {
                    console.log('[Builder] Logout detected. Clearing store.');
                    set({
                        data: {
                            userId: null,
                            projectId: null,
                            topic: '',
                            twist: '',
                            abstract: '',
                            outline: [],
                            mode: null,
                            status: 'OUTLINE_GENERATED'
                        },
                        step: 'TOPIC',
                        isPaid: false,
                        isFromChat: false,
                        hasServerHydrated: false
                    });
                    localStorage.removeItem(CHAT_HANDOFF_KEY);
                    return;
                }

                // CASE 3: Different authenticated user (account switch)
                // Only reset if BOTH are valid users and they differ
                if (currentData.userId !== null && userId !== null && currentData.userId !== userId) {
                    console.log('[Builder] Account switch detected.', { old: currentData.userId, new: userId });
                    set({
                        data: {
                            userId,
                            projectId: null,
                            topic: '',
                            twist: '',
                            abstract: '',
                            outline: [],
                            mode: null,
                            status: 'OUTLINE_GENERATED'
                        },
                        step: 'TOPIC',
                        isPaid: false,
                        isFromChat: false,
                        hasServerHydrated: false
                    });
                    localStorage.removeItem(CHAT_HANDOFF_KEY);
                }
            },

            // Load a full project object (e.g. from server)
            // This is the source of truth - marks hasServerHydrated to prevent overwrites
            loadProject: (projectData, isPaid = false) => {
                console.log('[Builder] Hydrating from server project', { id: projectData.projectId, isPaid, outlineLen: projectData.outline?.length });

                // CRITICAL: Clear stale chat handoff to prevent it from overwriting on next render
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(CHAT_HANDOFF_KEY);
                }

                // IMPORTANT: Use server data as the complete source of truth for critical fields
                // We merge but ensure server projectId, topic, outline ALWAYS win

                // Special case: Project was unlocked for topic switch (isPaid, !isLocked, no abstract)
                // Should start at TOPIC step to allow user to pick a new topic
                const isUnlockedForTopicSwitch = isPaid && !projectData.isLocked && !projectData.abstract && projectData.topic;

                set((state) => ({
                    // Determine step based on data presence
                    step: isUnlockedForTopicSwitch ? 'TOPIC' // Force TOPIC step for unlocked topic-switch projects
                        : (projectData.outline && projectData.outline.length > 0) ? 'OUTLINE'
                            : projectData.abstract ? 'ABSTRACT'
                                : projectData.topic ? 'ABSTRACT' // If topic exists, go to Abstract
                                    : 'TOPIC',
                    data: {
                        // Start with defaults to ensure type safety
                        userId: null,
                        projectId: null,
                        topic: '',
                        twist: '',
                        abstract: '',
                        outline: [],
                        mode: null,
                        status: 'OUTLINE_GENERATED' as const,
                        isLocked: false,
                        // Then spread server data to override
                        ...projectData
                    },
                    isPaid: isPaid ?? false, // Hydrate payment status from server
                    isFromChat: false,
                    hasServerHydrated: true // Mark that server data is now loaded - prevents overwrites
                }));
            }
        }),
        {
            name: 'jstar-builder-storage', // unique name
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist data, not step or UI flags
                // NOTE: step is NOT persisted - server determines step from data presence
                // NOTE: isPaid is NOT persisted - server is source of truth for payment
                // NOTE: hasServerHydrated is NOT persisted - resets each session
                data: state.data,
                isFromChat: state.isFromChat
            }),
        }
    )
);
