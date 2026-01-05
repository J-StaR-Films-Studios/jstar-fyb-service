/**
 * useChatSync Hook
 * Handles fetching historical conversation data based on anonymousId or userId.
 */

import { useState, useEffect, useRef } from "react";
import { getLatestConversation } from "../actions/chat";

// Helper to map DB messages to UI messages
const formatHistoryMessages = (dbMessages: any[]) => {
    return dbMessages.map((m: any) => ({
        id: m.id,
        role: m.role as any,
        content: m.content as string,
        // Ensure parts exist for AI SDK v3+ compatibility if needed
        parts: [{ type: 'text' as const, text: m.content as string }],
        createdAt: new Date(m.createdAt)
    }));
};

export function useChatSync(
    userId: string | undefined,
    anonymousId: string,
    setMessages: (messages: any[]) => void,
    setConversationId: (id: string) => void
) {
    const hasSyncedHistory = useRef(false);

    // Reset sync status if user logs in
    useEffect(() => {
        if (userId) {
            hasSyncedHistory.current = false;
        }
    }, [userId]);

    // Sync logic
    useEffect(() => {
        // Only sync if we have an anonymousId (which is always generated client-side)
        // and haven't synced yet (or reset due to login)
        if (!hasSyncedHistory.current && anonymousId && anonymousId !== "") {
            const syncHistory = async () => {
                // Pass botType: 'jay' to ensure we only load Jay's conversations, not Nengi's
                const latest = await getLatestConversation({ anonymousId, userId, botType: 'jay' });

                if (latest && latest.messages.length > 0) {
                    setConversationId(latest.id);
                    const formatted = formatHistoryMessages(latest.messages);
                    // Cast to any because the exact AI SDK Message type might vary slightly in Strict Mode
                    // but the shape aligns with what useChat expects for initialMessages
                    setMessages(formatted as any);
                }
                hasSyncedHistory.current = true;
            };
            syncHistory();
        }
    }, [anonymousId, userId, setMessages, setConversationId]);
}
