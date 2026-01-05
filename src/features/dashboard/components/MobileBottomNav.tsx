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
        <nav className="fixed bottom-0 w-full bg-dark/90 backdrop-blur-xl border-t border-white/10 z-50 md:hidden">
            <div className="grid grid-cols-5 items-end h-20 pb-4 px-2">
                {/* 1. Home */}
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/') && pathname === '/' ? "text-white" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Home className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                </Link>

                {/* 2. Projects */}
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/dashboard') ? "text-white" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Folder className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Projects</span>
                </Link>

                {/* 3. FAB (Build) - Centered & Raised */}
                <div className="flex justify-center relative -top-6">
                    <Link
                        href="/project/builder"
                        className={cn(
                            "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform ring-4 ring-dark",
                            isActive('/project/builder')
                                ? "bg-primary text-white scale-105 shadow-primary/40"
                                : "bg-primary/80 text-white/90 hover:bg-primary hover:scale-105"
                        )}
                    >
                        <Hammer className="w-6 h-6 fill-current" />
                    </Link>
                </div>

                {/* 4. Chat (New) */}
                <Link
                    href={hasActiveProject ? "/hub" : "/chat"}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/chat') || isActive('/hub') ? "text-white" : "text-gray-500 hover:text-white"
                    )}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
                </Link>

                {/* 5. Me */}
                <Link
                    href="/profile"
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors pb-1",
                        isActive('/profile') ? "text-white" : "text-gray-500 hover:text-white"
                    )}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Me</span>
                </Link>
            </div>
        </nav>
    );
};
