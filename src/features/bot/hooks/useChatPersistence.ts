/**
 * useChatPersistence Hook
 * Handles anonymous ID generation and chat persistence on completion.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { saveConversation } from "../actions/chat";
import { generateUUID } from "@/lib/uuid";

export function useChatPersistence(userId?: string) {
    const [anonymousId, setAnonymousId] = useState<string>("");

    // Refs for accessing latest values in async callbacks
    const anonymousIdRef = useRef(anonymousId);
    const userIdRef = useRef(userId);

    // Keep refs in sync
    useEffect(() => {
        anonymousIdRef.current = anonymousId;
    }, [anonymousId]);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    // Initialize anonymousId
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem("jstar_anonymous_id");
            if (!id) {
                id = generateUUID();
                localStorage.setItem("jstar_anonymous_id", id);
            }
            setAnonymousId(id);
        }
    }, []);

    // Main persistence handler
    // We expect conversationId to be passed in real-time or via a ref from the parent
    // but easier to pass it as an arg to the returned function wrapper if possible.
    // However, onFinish only gives us the `message`.
    // So the parent component needs to maintain refs for conversationId and messages.

    // Actually, looking at the original code, `onFinish` needs access to the *entire* message history to save it correctly (or at least check the last one).
    // The original `useChatFlow` used a ref `messagesRef` to access `aiMessages`.

    // To make this hook reusable, we should probably accept the *current* values via refs or just return the logic 
    // and let the parent manage the refs.

    // Let's return the `anonymousId` and a helper that the parent can call inside `onFinish`.

    const persistChat = useCallback(async (
        message: any,
        currentMessages: any[],
        conversationId: string | undefined
    ) => {
        const currentUserId = userIdRef.current;
        const currentAnonymousId = anonymousIdRef.current;

        if (!currentUserId && !currentAnonymousId) return;

        // Ensure the final message is included
        const messagesToSave = [...currentMessages];
        const lastMsg = messagesToSave[messagesToSave.length - 1];

        if (!lastMsg || lastMsg.id !== message.id) {
            messagesToSave.push(message);
        } else {
            messagesToSave[messagesToSave.length - 1] = message;
        }

        try {
            // Sanitize
            const cleanMessages = messagesToSave.map(m => {
                let role = 'user';
                if (m.role === 'assistant' || m.role === 'ai' || m.role === 'system') {
                    role = m.role === 'ai' ? 'assistant' : m.role;
                } else if (m.role === 'data') {
                    role = 'user';
                }

                let textContent = '';
                if (typeof m.content === 'string' && m.content) {
                    textContent = m.content;
                } else if (m.parts) {
                    textContent = m.parts
                        .filter((p: any) => p.type === 'text')
                        .map((p: any) => p.text)
                        .join('');
                }

                return {
                    role: role as 'user' | 'assistant' | 'system',
                    content: textContent,
                };
            }).filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system');

            await saveConversation({
                conversationId: conversationId,
                userId: currentUserId,
                anonymousId: currentAnonymousId,
                messages: cleanMessages,
                botType: 'jay' // Ensure Jay's conversations are saved with correct title
            });

        } catch (err) {
            console.error('[useChatPersistence] Failed to persist chat:', err);
        }
    }, []);

    return {
        anonymousId,
        persistChat
    };
}
