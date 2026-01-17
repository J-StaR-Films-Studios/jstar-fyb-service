"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X, Loader2, Info } from "lucide-react";

interface CustomerChatProps {
    projectId: string;
}

type Message = {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
};

// J Star Collective Popup Component
function JStarCollectivePopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    const agents = [
        {
            initial: 'J',
            name: 'Jay',
            phase: 'PHASE 1',
            phaseColor: 'text-purple-400',
            gradient: 'from-purple-500 to-purple-800',
            role: 'Onboarding Expert – Finds your killer topic'
        },
        {
            initial: 'M',
            name: 'Monji',
            phase: 'PHASE 2',
            phaseColor: 'text-cyan-400',
            gradient: 'from-cyan-500 to-blue-600',
            role: 'Academic Copilot – Writes with precision & style'
        },
        {
            initial: 'N',
            name: 'Nengi',
            phase: 'ALWAYS ON',
            phaseColor: 'text-green-400',
            gradient: 'from-green-500 to-emerald-600',
            role: 'General Assistant – Brain dump & support'
        }
    ];

    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-dark border border-white/10 rounded-2xl w-full max-w-sm relative shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3 text-xl">🎓</div>
                    <h3 className="text-lg font-bold mb-1 text-white">The J Star Collective</h3>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                        Three AI personalities, each specialized for a different phase of your academic journey.
                    </p>

                    <div className="space-y-2">
                        {agents.map((agent) => (
                            <div key={agent.name} className="flex gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${agent.gradient} flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>
                                    {agent.initial}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-white">
                                        {agent.name} <span className={`text-[9px] ${agent.phaseColor} ml-1`}>{agent.phase}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">{agent.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-primary/20"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CustomerChat({ projectId }: CustomerChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showCollective, setShowCollective] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Jay's initial greeting
    const jayGreeting: Message = {
        id: 'jay-greeting',
        role: 'assistant',
        content: "Yo! I'm Jay, your FYP plug. Tell me what department you're in or drop a rough topic idea – let's find something that'll make your supervisor smile! 🔥",
        createdAt: new Date()
    };

    // Fetch messages on mount
    useEffect(() => {
        if (isOpen) {
            fetchMessages();
        }
    }, [isOpen, projectId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/messages`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        setIsLoading(true);
        const tempMsg: Message = {
            id: Date.now().toString(),
            role: "customer",
            content: newMessage,
            createdAt: new Date()
        };
        setMessages([...messages, tempMsg]);
        setNewMessage("");

        try {
            await fetch(`/api/projects/${projectId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "customer", content: newMessage })
            });
        } catch (error) {
            console.error("Failed to send message:", error);
        }

        setIsLoading(false);
    };

    // Display messages with Jay's greeting if empty
    const displayMessages = messages.length === 0 ? [jayGreeting] : messages;

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-50"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 h-[450px] bg-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    Chat with Jay
                                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">AGENT</span>
                                </h3>
                                <p className="text-xs text-gray-500">Your FYP Architect</p>
                            </div>
                        </div>

                        {/* J Star Collective Badge */}
                        <button
                            onClick={() => setShowCollective(true)}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                        >
                            <div className="flex -space-x-1.5">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-purple-800 border border-dark flex items-center justify-center text-[8px] font-bold text-white">J</div>
                                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border border-dark flex items-center justify-center text-[8px] font-bold text-white">M</div>
                                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 border border-dark flex items-center justify-center text-[8px] font-bold text-white">N</div>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Jay + 2 Specialists</span>
                            <Info className="w-3 h-3 text-gray-500 group-hover:text-primary transition-colors" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                        {displayMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === "customer"
                                    ? "ml-auto bg-primary text-white"
                                    : "bg-white/10 text-gray-300"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />

                        {/* J Star Collective Popup */}
                        <JStarCollectivePopup isOpen={showCollective} onClose={() => setShowCollective(false)} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-white/5">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !newMessage.trim()}
                                className="p-2 bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <Send className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

