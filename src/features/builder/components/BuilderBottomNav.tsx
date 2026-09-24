'use client';

import { Home, Folder, BookOpen, User, Hammer } from 'lucide-react';
import Link from 'next/link';
import { useBuilderLayout } from '../context/BuilderLayoutContext';

/**
 * BuilderBottomNav
 * 
 * Builder-specific mobile bottom navigation with 4 tabs + center FAB.
 * Replaces the global MobileBottomNav on the builder route only.
 * 
 * Tabs:
 * - Home → /dashboard
 * - Projects → /dashboard (projects tab)
 * - Build (center FAB) → current route (active state)
 * - Research → toggles floating research panel
 * - Me → /profile
 */
export function BuilderBottomNav() {
    const { isResearchPanelOpen, toggleResearchPanel } = useBuilderLayout();

    return (
        <nav
            className="fixed bottom-0 w-full bg-writing border-t border-rule text-ink z-50 md:hidden pb-safe"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Builder navigation"
        >
            <div className="flex justify-between items-end px-4 h-20 pb-4 relative">
                {/* Home Tab */}
                <Link
                    href="/dashboard"
                    className="flex flex-col items-center justify-end text-ink-muted hover:text-rust transition-colors w-16 h-12"
                    aria-label="Go to Home"
                >
                    <Home className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Home</span>
                </Link>

                {/* Projects Tab */}
                <Link
                    href="/dashboard?tab=projects"
                    className="flex flex-col items-center justify-end text-ink-muted hover:text-rust transition-colors w-16 h-12"
                    aria-label="Go to Projects"
                >
                    <Folder className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Projects</span>
                </Link>

                {/* Build FAB - Center, Elevated */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                    <div
                        className="w-16 h-16 rounded-full bg-rust flex items-center justify-center border-4 border-writing cursor-default"
                        aria-label="Build mode (active)"
                    >
                        <Hammer className="w-7 h-7 text-writing" />
                    </div>
                    <span className="text-xs font-bold text-ink absolute -bottom-4 left-1/2 -translate-x-1/2 tracking-wider">
                        BUILD
                    </span>
                </div>

                {/* Spacer for FAB */}
                <div className="w-16" aria-hidden="true" />

                {/* Research Tab - Toggles panel */}
                <button
                    onClick={toggleResearchPanel}
                    className={`flex flex-col items-center justify-end transition-colors w-16 h-12 ${isResearchPanelOpen
                            ? 'text-rust'
                            : 'text-ink-muted hover:text-rust'
                        }`}
                    aria-label={isResearchPanelOpen ? 'Close Research panel' : 'Open Research panel'}
                    aria-pressed={isResearchPanelOpen}
                >
                    <div className="relative">
                        <BookOpen className="w-6 h-6 mb-1" />
                        {/* Active indicator dot */}
                        {isResearchPanelOpen && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                        )}
                    </div>
                    <span className="text-xs font-medium">Research</span>
                </button>

                {/* Me Tab */}
                <Link
                    href="/profile"
                    className="flex flex-col items-center justify-end text-ink-muted hover:text-rust transition-colors w-16 h-12"
                    aria-label="Go to Profile"
                >
                    <User className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Me</span>
                </Link>
            </div>
        </nav>
    );
}
