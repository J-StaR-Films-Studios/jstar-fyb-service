'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Folder, Home, User, MessageSquare, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

export const MobileBottomNav = ({ hasActiveProject }: { hasActiveProject?: boolean }) => {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="fixed bottom-0 w-full bg-writing border-t border-rule z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-5 items-end h-20 pb-4 px-2">
                {/* 1. Home */}
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/') && pathname === '/' ? "text-ink" : "text-ink-muted hover:text-rust"
                    )}
                >
                    <Home className="w-5 h-5" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider">Home</span>
                </Link>

                {/* 2. Projects */}
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/dashboard') ? "text-ink" : "text-ink-muted hover:text-rust"
                    )}
                >
                    <Folder className="w-5 h-5" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider">Projects</span>
                </Link>

                {/* 3. FAB (Build) - Centered & Raised */}
                <div className="flex justify-center relative -top-6">
                    <Link
                        href="/project/builder"
                        aria-label="Create Project"
                        className={cn(
                            "flex items-center justify-center w-14 h-14 rounded-full transition-colors ring-4 ring-writing",
                            isActive('/project/builder')
                                ? "bg-rust text-writing"
                                : "bg-rust text-writing hover:bg-rust/90"
                        )}
                    >
                        <Hammer className="w-6 h-6 fill-current" aria-hidden="true" />
                    </Link>
                </div>

                {/* 4. Chat (New) */}
                <Link
                    href={hasActiveProject ? "/hub" : "/chat"}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/chat') || isActive('/hub') ? "text-ink" : "text-ink-muted hover:text-rust"
                    )}
                >
                    <MessageSquare className="w-5 h-5" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider">Chat</span>
                </Link>

                {/* 5. Me */}
                <Link
                    href="/profile"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/profile') ? "text-ink" : "text-ink-muted hover:text-rust"
                    )}
                >
                    <User className="w-5 h-5" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider">Me</span>
                </Link>
            </div>
        </nav>
    );
};
