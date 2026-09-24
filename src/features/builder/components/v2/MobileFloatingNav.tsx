'use client';

import { PenTool, Library, Network, Settings, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

type Tab = 'write' | 'research' | 'chat' | 'diagrams' | 'settings';

interface MobileFloatingNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export const MobileFloatingNav = memo(function MobileFloatingNav({ activeTab, onTabChange }: MobileFloatingNavProps) {

    return (
        <nav aria-label="Workspace views" className="fixed bottom-0 left-0 right-0 bg-writing border-t border-rule p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] flex items-center justify-around gap-0.5 z-50 text-ink">

            <button
                onClick={() => onTabChange('write')}
                aria-label="Write" aria-current={activeTab === 'write' ? 'page' : undefined}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors min-w-0 min-h-11 flex-1 justify-center",
                    activeTab === 'write'
                        ? "px-1 py-2 bg-selection text-rust"
                        : "px-1 py-2 text-ink-muted hover:bg-selection hover:text-ink"
                )}
            >
                <PenTool className="w-5 h-5" />
                {activeTab === 'write' && <span className="font-bold text-xs">Write</span>}
            </button>

            <button
                onClick={() => onTabChange('research')}
                aria-label="Research" aria-current={activeTab === 'research' ? 'page' : undefined}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors min-w-0 min-h-11 flex-1 justify-center",
                    activeTab === 'research'
                        ? "px-1 py-2 bg-selection text-rust"
                        : "px-1 py-2 text-ink-muted hover:bg-selection hover:text-ink"
                )}
            >
                <Library className="w-5 h-5" />
                {activeTab === 'research' && <span className="font-bold text-xs">Research</span>}
            </button>

            <button
                onClick={() => onTabChange('chat')}
                aria-label="AI Chat" aria-current={activeTab === 'chat' ? 'page' : undefined}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors min-w-0 min-h-11 flex-1 justify-center",
                    activeTab === 'chat'
                        ? "px-1 py-2 bg-selection text-rust"
                        : "px-1 py-2 text-ink-muted hover:bg-selection hover:text-ink"
                )}
            >
                <div className="relative">
                    <MessageSquare className="w-5 h-5" />
                    {/* Optional: Add unread indicator here if needed */}
                </div>
                {activeTab === 'chat' && <span className="font-bold text-xs">AI Chat</span>}
            </button>

            <button
                onClick={() => onTabChange('diagrams')}
                aria-label="Diagrams" aria-current={activeTab === 'diagrams' ? 'page' : undefined}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors min-w-0 min-h-11 flex-1 justify-center",
                    activeTab === 'diagrams'
                        ? "px-1 py-2 bg-selection text-rust"
                        : "px-1 py-2 text-ink-muted hover:bg-selection hover:text-ink"
                )}
            >
                <Network className="w-5 h-5" />
                {activeTab === 'diagrams' && <span className="font-bold text-xs">Diagrams</span>}
            </button>

            <button
                onClick={() => onTabChange('settings')}
                aria-label="Settings" aria-current={activeTab === 'settings' ? 'page' : undefined}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors min-w-0 min-h-11 flex-1 justify-center",
                    activeTab === 'settings'
                        ? "px-1 py-2 bg-selection text-rust"
                        : "px-1 py-2 text-ink-muted hover:bg-selection hover:text-ink"
                )}
            >
                <Settings className="w-5 h-5" />
                {activeTab === 'settings' && <span className="font-bold text-xs">Settings</span>}
            </button>

        </nav>
    );
});
