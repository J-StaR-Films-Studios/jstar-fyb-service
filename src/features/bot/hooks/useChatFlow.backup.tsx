import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { saveConversation, getLatestConversation, saveLeadAction } from "../actions/chat";

export interface Message {
    id: string;
    role: "ai" | "user";
    content: React.ReactNode;
    toolInvocations?: any[];
    timestamp: string;
}

export type ChatState = "INITIAL" | "ANALYZING" | "PROPOSAL" | "NEGOTIATION" | "CLOSING" | "COMPLETED";

export interface ConfirmedTopic {
    topic: string;
    twist: string;
}

// ==============================================
// Phone Number Detection Utility
// ==============================================
// Robust regex to detect phone numbers with:
// - Optional country code (+234, +1, etc.)
// - Spaces, dashes, parentheses
// - Nigerian format (0803..., 234803...)
// - Minimum 10 digits to avoid false positives
const detectPhoneNumber = (text: string): string | null => {
    const cleanedText = text.replace(/[\s\-().]/g, '');
    // Match international or local phone patterns
    const phoneRegex = /^\+?\d{10,15}$/;
    if (phoneRegex.test(cleanedText)) {
        return cleanedText; // Return cleaned number
    }
    // Try to extract phone from longer text (e.g., "My number is 08012345678")
    const extractMatch = text.match(/(?:\+?\d[\d\s\-().]{9,17}\d)/);
    if (extractMatch) {
        const extracted = extractMatch[0].replace(/[\s\-().]/g, '');
        if (extracted.length >= 10 && extracted.length <= 15) {
            return extracted;
        }
    }
    return null;
};

export function useChatFlow(userId?: string) {
    const router = useRouter();
    const [state, setState] = useState<ChatState>("INITIAL");
    const [complexity, setComplexity] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [anonymousId, setAnonymousId] = useState<string>("");
    const [confirmedTopic, setConfirmedTopic] = useState<ConfirmedTopic | null>(null);
    const [hasProvidedPhone, setHasProvidedPhone] = useState(false);

    // Use refs to access current values in fetch without stale closures
    const conversationIdRef = useRef(conversationId);
    const anonymousIdRef = useRef(anonymousId);

    // Initialize anonymousId immediately if possible (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem("jstar_anonymous_id");
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem("jstar_anonymous_id", id);
            }
            setAnonymousId(id);
            anonymousIdRef.current = id; // Update ref immediately
        }
    }, []);

    // Keep refs in sync with state
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    useEffect(() => {
        anonymousIdRef.current = anonymousId;
    }, [anonymousId]);

    const userIdRef = useRef(userId);
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    // Standard AI SDK useChat with custom fetch to inject headers dynamically
    const {
        messages: aiMessages,
        sendMessage,
        status,
        error,
        regenerate,
        setMessages
    } = useChat({
        // Use custom fetch to ensure we can inject dynamic data
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
            const body = JSON.parse(options?.body as string || '{}');

            // Explicitly use the CURRENT ref value
            const currentUserId = userIdRef.current;

            body.anonymousId = anonymousIdRef.current;
            body.conversationId = conversationIdRef.current;
            body.userId = currentUserId;

            return fetch(url, {
                ...options,
                body: JSON.stringify(body),
            });
        },
        onFinish: (message: any) => {
            // Call the mutable ref to access latest state
            // We use 'any' here primarily to bypass strict checks if the SDK types mismatch, 
            // but ideally we import { Message } from 'ai'
            if (onFinishRef.current) {
                onFinishRef.current(message);
            }
        },
    } as any) as any;

    // Track messages in ref for access in onFinish
    const messagesRef = useRef(aiMessages);
    useEffect(() => {
        messagesRef.current = aiMessages;
    }, [aiMessages]);

    // Mutable ref for the onFinish logic to avoid stale closures
    const onFinishRef = useRef<any>(null);
    useEffect(() => {
        onFinishRef.current = async (message: any) => {
            const currentUserId = userIdRef.current;
            const currentAnonymousId = anonymousIdRef.current;
            const currentConversationId = conversationIdRef.current;
            const currentMessages = messagesRef.current;

            if (!currentUserId && !currentAnonymousId) return;

            // console.log('[useChatFlow] Persisting conversation (Client-First)...');


            // Ensure the final message is included
            const messagesToSave = [...currentMessages];
            const lastMsg = messagesToSave[messagesToSave.length - 1];

            // If the last message in state doesn't match the finished message ID, append it.
            // (AI SDK usually syncs state, but this guarantees we save the full final text)
            if (!lastMsg || lastMsg.id !== message.id) {
                // If the roles match (assistant), it might be a partial update issue, but usually 'id' persists.
                messagesToSave.push(message);
            } else {
                // Update the last message to ensure it has the full content
                messagesToSave[messagesToSave.length - 1] = message;
            }

            try {
                // Sanitize messages for server action
                const cleanMessages = messagesToSave.map(m => {
                    // Map generic roles to valid schema roles
                    let role = 'user';
                    if (m.role === 'assistant' || m.role === 'ai' || m.role === 'system') {
                        role = m.role === 'ai' ? 'assistant' : m.role;
                    } else if (m.role === 'data') {
                        role = 'user';
                    }

                    // Extract text content from parts if needed (AI SDK V3+ often uses parts)
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
                    conversationId: currentConversationId,
                    userId: currentUserId,
                    anonymousId: currentAnonymousId,
                    messages: cleanMessages
                });
                // console.log('[useChatFlow] Persistence complete.');
            } catch (err) {
                console.error('[useChatFlow] Failed to persist chat:', err);
            }
        };
    }, []); // Empty dependency array, but we rely on refs inside which is fine.

    // Reset synced history if identity changes (e.g. login)
    useEffect(() => {
        if (userId) {
            hasSyncedHistory.current = false;
        }
    }, [userId]);

    // Sync initial messages if we found a conversation
    const hasSyncedHistory = useRef(false);
    useEffect(() => {
        if (!hasSyncedHistory.current && anonymousId && anonymousId !== "") {
            const syncHistory = async () => {
                const currentUserId = userIdRef.current; // access ref to be sure

                const latest = await getLatestConversation({ anonymousId, userId: currentUserId });

                if (latest && latest.messages.length > 0) {
                    setConversationId(latest.id);
                    // Ensure messages are correctly formatted for UI
                    const formattedMessages = latest.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role as any,
                        content: m.content as string,
                        parts: [{ type: 'text' as const, text: m.content as string }],
                        createdAt: new Date(m.createdAt)
                    }));
                    setMessages(formattedMessages);
                }
                hasSyncedHistory.current = true;
            };
            syncHistory();
        }
    }, [anonymousId, userId, setMessages]);

    const isLoading = status === 'streaming' || status === 'submitted';

    // Transform AI SDK messages to our UI format
    const messages: Message[] = aiMessages
        .map((m: any, index: number) => {
            let textContent = '';
            if (m.parts) {
                const textPart = m.parts.find((p: any) => p.type === 'text');
                textContent = textPart?.text || '';
            } else if (typeof m.content === 'string') {
                textContent = m.content;
            }

            // Extract tool-related parts (both invocations and results)
            const toolParts = m.parts?.filter((p: any) =>
                p.type === 'tool-invocation' ||
                p.type === 'tool-result' ||
                p.type?.startsWith('tool-')
            );

            // ============================================================
            // INTELLIGENT TRIGGER: Check for WhatsApp mentions in text
            // ============================================================
            // If the AI asks for WhatsApp but forgets to call the tool, we inject it manually.
            const hasContactTool = toolParts?.some((p: any) => p.type === 'tool-requestContactInfo');
            const mentionsWhatsApp = textContent.toLowerCase().includes('whatsapp');

            // HEURISTIC: Prevent double-triggering logic
            // 1. If user ALREADY provided phone in this session, don't trigger.
            // 2. If user provided phone in the last 3 messages (lookback), don't trigger (handles reloads).
            let recentlyProvidedPhone = false;
            if (mentionsWhatsApp && !hasContactTool) {
                const lookbackCount = 3;
                const startCheck = Math.max(0, index - lookbackCount);
                // We need to check relevant AI messages source array `aiMessages`
                // Note: `m` comes from `aiMessages.map` but we don't have index `i` in the filter/map signature above easily unless we change it.
                // Actually we do: .map((m: any, index: number) => {

                // Let's use the index from the map function
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

            if (shouldTrigger) {
                // Determine reason based on context (simple heuristic)
                const reason = textContent.toLowerCase().includes('send')
                    ? "To send you the details"
                    : "To proceed with your project";

                // Inject synthetic tool invocation
                if (!toolParts) {
                    // m.toolInvocations = []; // Can't mutate m directly if it's from SDK, use local vars
                }

                // We'll return a new object anyway, so we can append to the toolInvocations array we build
                // Note: We use a specific ID format to identify it's synthetic if needed, but UI doesn't care.
                toolParts?.push({
                    type: 'tool-requestContactInfo',
                    state: 'output-available',
                    toolCallId: `synthetic - whatsapp - ${m.id} `,
                    output: { reason }
                });

                // If toolParts was undefined/empty and we just pushed, it might handle incorrectly if we don't init
                // Actually, if toolParts is undefined, the optional chaining above returns undefined.
                // We need to be more explicit.
            }

            // Re-build tool invocations array properly
            const finalToolInvocations = toolParts || [];
            if (shouldTrigger) {
                // Double check if we already pushed it (if toolParts existed)
                const alreadyAdded = finalToolInvocations.some((p: any) => p.type === 'tool-requestContactInfo');
                if (!alreadyAdded) {
                    finalToolInvocations.push({
                        type: 'tool-requestContactInfo',
                        state: 'output-available',
                        toolCallId: `synthetic - whatsapp - ${m.id} `,
                        output: { reason: "To proceed with the next steps" }
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


    // Watch for tool calls
    useEffect(() => {
        if (!aiMessages?.length) return;

        const lastMessage = aiMessages[aiMessages.length - 1];
        if (lastMessage.role !== 'assistant') return;

        // Check for tool calls in the last message parts
        // Vercel AI SDK structure: type = "tool-{toolName}", state = "output-available", data in input/output
        const toolCalls = lastMessage.parts?.filter((p: any) => p.type?.startsWith('tool-'));



        if (toolCalls) {
            for (const tool of toolCalls) {
                // Extract tool name from type (e.g., "tool-setComplexity" -> "setComplexity")
                const toolType = tool.type as string;

                // handle setComplexity
                if (toolType === 'tool-setComplexity' && tool.state === 'output-available') {
                    const level = tool.output?.level || tool.input?.level;
                    if (level) setComplexity(level as 1 | 2 | 3 | 4 | 5);
                }

                // handle requestContactInfo -> Move to CLOSING state
                if (toolType === 'tool-requestContactInfo' && tool.state === 'output-available') {
                    if (state !== "CLOSING") {
                        setState("CLOSING");
                    }
                }

                // handle confirmTopic -> Redirect logic
                if (toolType === 'tool-confirmTopic' && tool.state === 'output-available') {
                    const topic = tool.output?.topic || tool.input?.topic;
                    const twist = tool.output?.twist || tool.input?.twist;
                    if (topic) {
                        setConfirmedTopic({ topic, twist: twist || '' });
                        setState("COMPLETED");
                        localStorage.setItem('jstar_confirmed_topic', JSON.stringify({
                            topic,
                            twist: twist || '',
                            confirmedAt: new Date().toISOString(),
                            userId: userId || null
                        }));
                    }
                }
            }
        }

        // ============================================================
        // INTELLIGENT TRIGGER (State Logic)
        // ============================================================
        // Check if the latest message mentions WhatsApp but we aren't in CLOSING yet
        // This keeps the state in sync with the synthetic UI we render above
        let content = '';
        if (lastMessage.parts) {
            const textPart = lastMessage.parts.find((p: any) => p.type === 'text');
            content = textPart?.text || '';
        } else if (typeof lastMessage.content === 'string') {
            content = lastMessage.content;
        }

        // Apply same heuristics as the UI map
        let recentlyProvidedPhone = false;
        if (content.toLowerCase().includes('whatsapp')) {
            const lookbackCount = 3;
            const startCheck = Math.max(0, aiMessages.length - 1 - lookbackCount);
            for (let k = aiMessages.length - 2; k >= startCheck; k--) { // Start from message BEFORE last one
                const prevMsg = aiMessages[k];
                if (prevMsg && prevMsg.role === 'user') {
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

        if (content.toLowerCase().includes('whatsapp') && state !== 'CLOSING' && state !== 'COMPLETED' && !hasProvidedPhone && !recentlyProvidedPhone) {
            // Only force closing if we haven't already finished
            console.log('[useChatFlow] Detected "whatsapp" keyword, forcing CLOSING state.');
            setState("CLOSING");
        }

    }, [aiMessages, state, hasProvidedPhone]);



    const handleUserMessage = async (text: string) => {
        // ==============================================
        // UNIVERSAL PHONE DETECTION (Works in ANY state)
        // ==============================================
        const detectedPhone = detectPhoneNumber(text);

        if (detectedPhone) {
            // We have a phone number! Extract topic and save as lead.
            console.log("[useChatFlow] Phone detected, triggering lead capture:", detectedPhone);

            try {
                // Build message history for extraction
                const messageHistory = aiMessages.map((m: any) => {
                    let content = '';
                    if (m.parts) {
                        const textPart = m.parts.find((p: any) => p.type === 'text');
                        content = textPart?.text || '';
                    } else if (typeof m.content === 'string') {
                        content = m.content;
                    }
                    return { role: m.role, content };
                }).filter((m: any) => m.content);

                // Call extraction API to get structured topic data
                let extractedData = {
                    topic: confirmedTopic?.topic || "Pending AI Confirmation",
                    twist: confirmedTopic?.twist || "Pending Twist",
                    department: "Computer Science",
                    complexity: complexity,
                };

                try {
                    const extractRes = await fetch('/api/extract-topic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: messageHistory }),
                    });
                    if (extractRes.ok) {
                        const extracted = await extractRes.json();
                        extractedData = {
                            topic: extracted.topic || extractedData.topic,
                            twist: extracted.twist || extractedData.twist,
                            department: extracted.department || extractedData.department,
                            complexity: extracted.complexity || extractedData.complexity,
                        };
                        console.log("[useChatFlow] Extracted topic:", extractedData);
                    }
                } catch (extractError) {
                    console.warn("[useChatFlow] Extraction failed, using defaults:", extractError);
                }

                // Save lead with extracted data
                await saveLeadAction({
                    whatsapp: detectedPhone,
                    topic: extractedData.topic,
                    twist: extractedData.twist,
                    complexity: extractedData.complexity,
                    department: extractedData.department,
                    anonymousId: anonymousId,
                    userId: userId,
                });

                // Mark that user has provided phone (for manual fallback UI)
                setHasProvidedPhone(true);

                // Transition to CLOSING if not already there
                if (state !== "CLOSING" && state !== "COMPLETED") {
                    setState("CLOSING");
                }

                // Send the message to AI so flow continues naturally
                await sendMessage({ text: `My WhatsApp number is ${text} ` });
            } catch (err) {
                console.error("[useChatFlow] Lead save failed:", err);
                // Still send to AI so user isn't stuck
                await sendMessage({ text });
            }
            return;
        }


        // ==============================================
        // Default Behavior (No phone detected)
        // ==============================================
        try {
            if (state === "INITIAL") {
                setState("ANALYZING");
            } else {
                setState("ANALYZING");
            }

            await sendMessage({ text });
        } catch (err) {
            console.error("Message failed:", err);
            setState("PROPOSAL");
        } finally {
            setState((currentState) => {
                if (currentState === "ANALYZING") {
                    return "PROPOSAL";
                }
                return currentState;
            });
        }
    };


    const handleAction = (action: "accept" | "simplify" | "harder") => {
        // These serve as quick replies
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

    // New: Handle when user clicks on a specific topic card
    const handleSelectTopic = (topic: { title: string; twist: string; difficulty: string }) => {
        sendMessage({ text: `I want to go with "${topic.title}" - the ${topic.twist} approach.Let's do this!` });
    };

    const proceedToBuilder = () => {
        // If user is already authenticated, go directly to builder
        if (userId) {
            router.push('/project/builder');
        } else {
            // Otherwise, redirect to register with callback
            router.push('/auth/register?callbackUrl=/project/builder');
        }
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
        proceedToBuilder
    };
}
