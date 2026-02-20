'use client';

import { Bot, Globe, Download, Presentation, Zap } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
    projectId: string;
}

export function QuickActions({ projectId }: QuickActionsProps) {
    return (
        <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {/* Ask Monji */}
                <Link
                    href={`/project/${projectId}/workspace?tab=chat`}
                    className="p-4 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition-all text-left group"
                >
                    <Bot className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm text-gray-200 group-hover:text-white">Ask Monji</div>
                    <div className="text-[10px] text-gray-500">Chat with AI</div>
                </Link>

                {/* Deep Research */}
                <Link
                    href={`/project/${projectId}/workspace?tab=research`}
                    className="p-4 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition-all text-left group"
                >
                    <Globe className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm text-gray-200 group-hover:text-white">Deep Research</div>
                    <div className="text-[10px] text-gray-500">Find new sources</div>
                </Link>

                {/* Export */}
                <Link
                    href={`/project/${projectId}/workspace?tab=export`}
                    className="p-4 rounded-xl bg-white/5 hover:bg-green-500/10 border border-white/5 hover:border-green-500/30 transition-all text-left group"
                >
                    <Download className="w-5 h-5 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm text-gray-200 group-hover:text-white">Export</div>
                    <div className="text-[10px] text-gray-500">PDF / Word</div>
                </Link>

                {/* Slides */}
                <Link
                    href={`/project/${projectId}/workspace?tab=slides`}
                    className="p-4 rounded-xl bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 transition-all text-left group"
                >
                    <Presentation className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm text-gray-200 group-hover:text-white">Slides</div>
                    <div className="text-[10px] text-gray-500">Create Deck</div>
                </Link>
            </div>
        </div>
    );
}
