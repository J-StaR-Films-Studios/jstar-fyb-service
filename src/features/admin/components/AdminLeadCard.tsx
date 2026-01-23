"use client";

import { MessageCircle, Phone, Clock } from "lucide-react"; // WhatsApp icon usually custom or MessageCircle
import { SendPaymentLinkButton } from "./SendPaymentLinkButton";

// ... imports

interface Lead {
    id: string;
    whatsapp: string;
    department: string;
    topic: string;
    twist: string;
    complexity: number;
    status: string;
    tier?: string | null;
    createdAt: Date | string;
}

function TierBadge({ tier }: { tier: string | null | undefined }) {
    if (!tier) return null;

    const colors: Record<string, string> = {
        'AGENCY_SOFT_LIFE': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'AGENCY_DEFENSE_READY': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        'AGENCY_CODE_GO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'AGENCY_PAPER_PREMIUM': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'AGENCY_PAPER_DEFENSE': 'bg-green-500/20 text-green-400 border-green-500/30',
        'AGENCY_PAPER_EXPRESS': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    const tierLabel = tier.replace('AGENCY_', '').replace(/_/g, ' ');

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border my-2 inline-block ${colors[tier] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {tierLabel}
        </span>
    );
}

export function AdminLeadCard({ lead }: { lead: Lead }) {
    const whatsappLink = `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 hover:border-primary/30 transition-colors">

            {/* Header: Topic & Status */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-accent uppercase">{lead.department}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <TierBadge tier={lead.tier} />
                    <h3 className="font-display font-bold text-lg leading-tight line-clamp-2 mt-1" title={lead.topic}>
                        {lead.topic}
                    </h3>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${lead.status === 'NEW' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    lead.status === 'SOLD' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                    {lead.status}
                </span>
            </div>

            {/* Twist */}
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <p className="text-sm text-gray-300 italic">
                    <span className="text-primary font-bold not-italic">AI Twist:</span> {lead.twist}
                </p>
            </div>

            {/* Stats/Complexity */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Complexity</span>
                <div className="flex gap-1">
                    {[...Array(lead.complexity || 1)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-4 rounded-full ${lead.complexity > 3 ? 'bg-red-500' : 'bg-green-500'}`} />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-[#25D366]/20 text-[#25D366] rounded-lg hover:bg-[#25D366]/30 transition-colors border border-[#25D366]/20"
                        title="Open WhatsApp"
                    >
                        <MessageCircle className="w-4 h-4" />
                    </a>
                    <a
                        href={`tel:${lead.whatsapp}`}
                        className="p-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                        title="Call"
                    >
                        <Phone className="w-4 h-4" />
                    </a>
                </div>

                <SendPaymentLinkButton leadId={lead.id} />
            </div>

        </div>
    );
}
