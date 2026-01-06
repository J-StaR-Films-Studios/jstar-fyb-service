'use client';

import { PenTool, Library, Network, Settings, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type Tab = 'write' | 'research' | 'chat' | 'diagrams' | 'settings';

interface MobileFloatingNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function MobileFloatingNav({ activeTab, onTabChange }: MobileFloatingNavProps) {

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#030014]/90 backdrop-blur-2xl border border-white/10 rounded-full p-2 shadow-2xl flex items-center gap-1 z-50 max-w-[95vw] overflow-hidden">

            <button
                onClick={() => onTabChange('write')}
                className={cn(
                    "flex items-center gap-2 rounded-full transition-all duration-300 shrink-0",
                    activeTab === 'write'
                        ? "px-6 py-3 bg-primary text-white shadow-lg shadow-primary/30"
                        : "w-12 h-12 justify-center text-gray-400 hover:bg-white/10 hover:text-white"
                )}
            >
                <PenTool className="w-5 h-5" />
                {activeTab === 'write' && <span className="font-bold text-xs uppercase animate-in fade-in slide-in-from-left-2">Write</span>}
            </button>

            <button
                onClick={() => onTabChange('research')}
                className={cn(
                    "flex items-center gap-2 rounded-full transition-all duration-300 shrink-0",
                    activeTab === 'research'
                        ? "px-6 py-3 bg-accent text-white shadow-lg shadow-accent/30"
                        : "w-12 h-12 justify-center text-gray-400 hover:bg-white/10 hover:text-white"
                )}
            >
                <Library className="w-5 h-5" />
                {activeTab === 'research' && <span className="font-bold text-xs uppercase animate-in fade-in slide-in-from-left-2">Research</span>}
            </button>

            <button
                onClick={() => onTabChange('chat')}
                className={cn(
                    "flex items-center gap-2 rounded-full transition-all duration-300 shrink-0",
                    activeTab === 'chat'
                        ? "px-6 py-3 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                        : "w-12 h-12 justify-center text-gray-400 hover:bg-white/10 hover:text-white"
                )}
            >
                <div className="relative">
                    <MessageSquare className="w-5 h-5" />
                    {/* Optional: Add unread indicator here if needed */}
                </div>
                {activeTab === 'chat' && <span className="font-bold text-xs uppercase animate-in fade-in slide-in-from-left-2">AI Chat</span>}
            </button>

            <button
                onClick={() => onTabChange('diagrams')}
                className={cn(
                    "flex items-center gap-2 rounded-full transition-all duration-300 shrink-0",
                    activeTab === 'diagrams'
                        ? "px-6 py-3 bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                        : "w-12 h-12 justify-center text-gray-400 hover:bg-white/10 hover:text-white"
                )}
            >
                <Network className="w-5 h-5" />
                {activeTab === 'diagrams' && <span className="font-bold text-xs uppercase animate-in fade-in slide-in-from-left-2">Diagrams</span>}
            </button>

            <button
                onClick={() => onTabChange('settings')}
                className={cn(
                    "flex items-center gap-2 rounded-full transition-all duration-300 shrink-0",
                    activeTab === 'settings'
                        ? "px-6 py-3 bg-gray-700 text-white shadow-lg shadow-gray-700/30"
                        : "w-12 h-12 justify-center text-gray-400 hover:bg-white/10 hover:text-white"
                )}
            >
                <Settings className="w-5 h-5" />
                {activeTab === 'settings' && <span className="font-bold text-xs uppercase animate-in fade-in slide-in-from-left-2">Settings</span>}
            </button>

        </nav>
    );
}
