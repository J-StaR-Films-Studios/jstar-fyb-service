"use client";

import { useState } from "react";
import { Send, FileText, Link as LinkIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Project = {
    id: string;
    topic: string;
    twist: string | null;
    abstract: string | null;
    mode: string;
    status: string;
    documents: { id: string; fileName: string; fileType: string; fileUrl: string | null; createdAt: Date }[];
    messages: { id: string; role: string; content: string; createdAt: Date }[];
    outline: { content: string } | null;
};

const STATUS_OPTIONS = [
    "OUTLINE_GENERATED",
    "RESEARCH_IN_PROGRESS",
    "RESEARCH_COMPLETE",
    "WRITING_IN_PROGRESS",
    "PROJECT_COMPLETE"
];

import { SendPaymentLinkButton } from "./SendPaymentLinkButton"; // Import Button

type BillingDetails = {
    totalPaid: number;
    currentTrack: string;
    isAgencyMode: boolean;
};

export function AdminProjectDetail({ project, billing }: { project: Project, billing: BillingDetails }) {
    const [status, setStatus] = useState(project.status);
    const [messages, setMessages] = useState(project.messages);
    const [newMessage, setNewMessage] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        setIsUpdating(true);
        setStatus(newStatus);

        await fetch(`/api/projects/${project.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        setIsUpdating(false);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const msg = { id: Date.now().toString(), role: "admin", content: newMessage, createdAt: new Date() };
        setMessages([...messages, msg]);
        setNewMessage("");

        await fetch(`/api/projects/${project.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "admin", content: newMessage })
        });
    };

    const handleExtract = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents/${docId}/extract`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                toast.success("Extraction complete! Refresh to see results.");
            } else {
                toast.error("Extraction failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Extraction error:", error);
            toast.error("Extraction failed");
        }
    };

    return (
        <div className="min-h-screen bg-dark text-white p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h1 className="text-xl md:text-2xl font-display font-bold break-words">{project.topic}</h1>
                                {billing.totalPaid > 0 && (
                                    <span className="shrink-0 px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/20">
                                        Paid: ₦{billing.totalPaid.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 text-sm line-clamp-2 md:line-clamp-none">{project.twist}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* NEW: Payment Link Button for PRORATED Upgrades */}
                            <SendPaymentLinkButton
                                projectId={project.id}
                                totalPaid={billing.totalPaid}
                            />

                            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase ${project.mode === "CONCIERGE" ? "bg-accent" : "bg-gray-600"
                                }`}>
                                {project.mode}
                            </span>

                            <select
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isUpdating}
                                className="flex-1 md:flex-none bg-dark border border-white/10 rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-primary text-white appearance-none cursor-pointer min-w-[140px]"
                                style={{ colorScheme: 'dark' }}
                            >
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s} className="bg-dark text-white">{s.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Chat Panel */}
                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl flex flex-col h-[600px]">
                        <div className="p-4 border-b border-white/5">
                            <h2 className="font-bold">Chat with Customer</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No messages yet.</p>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`max-w-[80%] p-3 rounded-xl ${msg.role === "admin"
                                            ? "ml-auto bg-primary/20 text-white"
                                            : "bg-white/5 text-gray-300"
                                            }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <span className="text-[10px] text-gray-500 mt-1 block">
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-4 bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Documents */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h3 className="font-bold mb-4">Documents ({project.documents.length})</h3>
                            <div className="space-y-2">
                                {project.documents.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No documents uploaded.</p>
                                ) : (
                                    project.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                                            {doc.fileUrl ? (
                                                <LinkIcon className="w-4 h-4 text-purple-400" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-blue-400" />
                                            )}
                                            <span className="text-sm truncate flex-1">{doc.fileName}</span>
                                            {!doc.fileUrl && (
                                                <button
                                                    onClick={() => handleExtract(doc.id)}
                                                    className="text-[10px] px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                                                >
                                                    Extract
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Abstract Preview */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h3 className="font-bold mb-4">Abstract</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                {project.abstract?.slice(0, 300)}...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
