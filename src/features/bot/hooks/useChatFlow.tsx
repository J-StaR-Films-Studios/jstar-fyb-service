/**
 * useChatFlow Hook (Refactored)
 * 
 * Orchestrates chat logic by composing specialized hooks:
 * - useChatPersistence: Handles anonymous ID and saving chats
 * - useChatSync: Handles fetching history
 * - useChatToolHandlers: Handles AI tool side effects
 * 
 * Main responsibilities retained:
 * - State management (Machine state: INITIAL -> CLOSING)
 * - Lead Capture Logic (User phone detection)
 * - Navigation
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { saveLeadAction } from "../actions/chat";

import { Message, ChatState, ConfirmedTopic } from "./types";
import { useChatPersistence } from "./useChatPersistence";
import { useChatSync } from "./useChatSync";
import { useChatToolHandlers, detectPhoneNumber } from "./useChatTools";

// Re-export types for consumers (e.g. SuggestionChips)
export type { Message, ChatState, ConfirmedTopic };


export function useChatFlow(userId?: string) {
    const router = useRouter();

    // Core State
    const [state, setState] = useState<ChatState>("INITIAL");
    const [complexity, setComplexity] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [confirmedTopic, setConfirmedTopic] = useState<ConfirmedTopic | null>(null);
    const [hasProvidedPhone, setHasProvidedPhone] = useState(false);

    // specialized hooks
    const { anonymousId, persistChat } = useChatPersistence(userId);

    // Refs for accessing current values in async callbacks (fetch/onFinish)
    const conversationIdRef = useRef(conversationId);
    const anonymousIdRef = useRef(anonymousId);
    const userIdRef = useRef(userId);

    // Keep refs in sync
    useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
    useEffect(() => { anonymousIdRef.current = anonymousId; }, [anonymousId]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

    // AI SDK Hook
    const {
        messages: aiMessages,
        sendMessage,
        status,
        error,
        regenerate,
        setMessages
    } = useChat({
        // Custom fetch to inject identity headers
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
            const body = JSON.parse(options?.body as string || '{}');
            body.anonymousId = anonymousIdRef.current;
            body.conversationId = conversationIdRef.current;
            body.userId = userIdRef.current;

            return fetch(url, {
                ...options,
                body: JSON.stringify(body),
            });
        },
        onFinish: (message: any) => {
            // Persist valid conversation
            persistChat(message, messagesRef.current, conversationIdRef.current);
        },
    } as any) as any;

    // Track messages for persistence access
    const messagesRef = useRef(aiMessages);
    useEffect(() => { messagesRef.current = aiMessages; }, [aiMessages]);

    // Sync History
    useChatSync(userId, anonymousId, setMessages, setConversationId);

    // Tool Handlers & Intelligent Triggers
    useChatToolHandlers({
        aiMessages,
        state,
        setState,
        hasProvidedPhone,
        setComplexity,
        setConfirmedTopic,
        userId
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // UI Message Transformation
    // (Kept here as it's purely UI transformation logic, not state)
    const messages: Message[] = aiMessages
        .map((m: any, index: number) => {
            let textContent = '';
            // Handle parts vs content
            if (m.parts) {
                const textPart = m.parts.find((p: any) => p.type === 'text');
                textContent = textPart?.text || '';
            } else if (typeof m.content === 'string') {
                textContent = m.content;
            }

            // Extract tool parts
            const toolParts = m.parts?.filter((p: any) =>
                p.type === 'tool-invocation' ||
                p.type === 'tool-result' ||
                p.type?.startsWith('tool-')
            );

            // Re-construct synthetic tool invocations for WhatsApp if needed
            // This is UI-only logic to SHOW the "Request Contact" card
            // duplication of logic from original hook slightly, but simpler
            const hasContactTool = toolParts?.some((p: any) => p.type === 'tool-requestContactInfo');
            const mentionsWhatsApp = textContent.toLowerCase().includes('whatsapp');

            // Heuristic check: Prevent double-triggering if user RECENTLY provided phone
            let recentlyProvidedPhone = false;
            if (mentionsWhatsApp && !hasContactTool) {
                const lookbackCount = 3;
                const startCheck = Math.max(0, index - lookbackCount);
                // Check recent messages for user phone number
                for (let k = index - 1; k >= startCheck; k--) {
                    const prevMsg = aiMessages[k];
                    if (prevMsg && prevMsg.role === 'user') {
                        // Extract content
                        let prevContent = '';
                        if (typeof prevMsg.content === 'string') prevContent = prevMsg.content;
                        else if (prevMsg.parts) prevContent = prevMsg.parts.find((p: any) => p.type === 'text')?.text || '';

                        if (detectPhoneNumber(prevContent)) {
                            recentlyProvidedPhone = true;
                            break;
                        }
                    }
                }
            }

            const shouldTrigger = mentionsWhatsApp && !hasContactTool && m.role !== 'user' && !hasProvidedPhone && !recentlyProvidedPhone;

            let finalToolInvocations = toolParts || [];
            if (shouldTrigger) {
                // Check if we should inject synthetic card
                // We rely on the useChatTools to force state change, here we just show the card
                const alreadyAdded = finalToolInvocations.some((p: any) => p.type === 'tool-requestContactInfo');
                if (!alreadyAdded) {
                    finalToolInvocations.push({
                        type: 'tool-requestContactInfo',
                        state: 'output-available',
                        toolCallId: `synthetic-whatsapp-${m.id}`,
                        output: { reason: "To proceed with your project" }
                    });
                }
            }

            return {
                id: m.id,
                role: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
                content: textContent,
                toolInvocations: finalToolInvocations.length > 0 ? finalToolInvocations : undefined,
                timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
            };
        })
        .filter((m: any) => m.content && (typeof m.content === 'string' ? m.content.trim() : true));


    // ==============================================
    // User Actions
    // ==============================================

    const handleUserMessage = async (text: string) => {
        // Universal Phone Detection
        const detectedPhone = detectPhoneNumber(text);

        if (detectedPhone) {
            console.log("[useChatFlow] Phone detected:", detectedPhone);

            try {
                // Build history for extraction
                const messageHistory = aiMessages.map((m: any) => ({
                    role: m.role,
                    content: m.content || m.parts?.find((p: any) => p.type === 'text')?.text || ''
                })).filter((m: any) => m.content);

                // Default data
                let extractedData = {
                    topic: confirmedTopic?.topic || "Pending",
                    twist: confirmedTopic?.twist || "Pending Twist",
                    department: "Computer Science",
                    complexity,
                };

                // Try extraction API
                try {
                    const res = await fetch('/api/extract-topic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: messageHistory }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        extractedData = { ...extractedData, ...data };
                    }
                } catch (e) {
                    console.warn("Extraction failed", e);
                }

                await saveLeadAction({
                    whatsapp: detectedPhone,
                    topic: extractedData.topic,
                    twist: extractedData.twist,
                    complexity: extractedData.complexity,
                    department: extractedData.department,
                    anonymousId,
                    userId
                });

                setHasProvidedPhone(true);
                if (state !== "CLOSING" && state !== "COMPLETED") setState("CLOSING");

                await sendMessage({ text: `My WhatsApp number is ${text}` });
            } catch (err) {
                console.error("Lead capture failed", err);
                await sendMessage({ text });
            }
            return;
        }

        // Standard Message
        try {
            if (state === "INITIAL") setState("ANALYZING");
            else setState("ANALYZING"); // Keep/Set analyzing during generation

            await sendMessage({ text });
        } catch (err) {
            console.error("Msg failed", err);
            setState("PROPOSAL"); // Fallback
        } finally {
            // Optimistic stat update handled by tool handler, but here we can reset if needed
            setState(currentState => currentState === "ANALYZING" ? "PROPOSAL" : currentState);
        }
    };

    const handleAction = (action: "accept" | "simplify" | "harder") => {
        if (action === "accept") {
            setState("CLOSING");
            sendMessage({ text: "I accept this topic. Let's proceed." });
        } else if (action === "simplify") {
            setComplexity(prev => Math.max(1, prev - 1) as any);
            sendMessage({ text: "That's too complex. Make it simpler." });
        } else if (action === "harder") {
            setComplexity(prev => Math.min(5, prev + 1) as any);
            sendMessage({ text: "Too boring. Give me something harder." });
        }
    };

    const handleSelectTopic = (topic: { title: string; twist: string; difficulty: string }) => {
        sendMessage({ text: `I want to go with "${topic.title}" - the ${topic.twist} approach. Let's do this!` });
    };

    const proceedToBuilder = () => {
        if (userId) router.push('/project/builder');
        else router.push('/auth/register?callbackUrl=/project/builder');
    };

    /**
     * Reset all local chat state. Called after server-side clear.
     */
    const clearChat = () => {
        setMessages([]);
        setState("INITIAL");
        setComplexity(1);
        setConfirmedTopic(null);
        setHasProvidedPhone(false);
        setConversationId(undefined);
    };

    return {
        messages,
        state,
        complexity,
        isLoading,
        confirmedTopic,
        hasProvidedPhone,
        error,
        regenerate,
        handleUserMessage,
        handleAction,
        handleSelectTopic,
        proceedToBuilder,
        clearChat,
        anonymousId
    };
}
