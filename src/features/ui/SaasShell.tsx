'use client';

import { signOut } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, LayoutDashboard, Plus, Hammer, MessageSquare, HelpCircle, Keyboard, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/features/dashboard/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSupport } from "@/features/support/context/SupportContext";
import { OnboardingTour } from "@/features/onboarding/components/OnboardingTour";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/features/shortcuts/components/KeyboardShortcutsHelp";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";

// Helper component to avoid hook call issues in the dropdown
const SupportButton = ({ onClose }: { onClose: () => void }) => {
    const { openSupport } = useSupport();
    return (
        <button
            onClick={() => {
                openSupport();
                onClose();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
        >
            <HelpCircle className="w-4 h-4" />
            Contact Support
        </button>
    );
};

interface SaasShellProps {
    children: React.ReactNode;
    user: {
        name?: string | null;
        image?: string | null;
        email?: string | null;
        id?: string;
    };
    headerContent?: React.ReactNode;
    fullWidth?: boolean;
    hasActiveProject?: boolean;
    noPadding?: boolean;
    hideBottomNav?: boolean;
}

export const SaasShell = ({ children, user, headerContent, fullWidth = false, hasActiveProject = false, noPadding = false, hideBottomNav = false }: SaasShellProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const isDashboard = pathname === "/dashboard";
    const isHub = pathname === "/hub";
    const { startTour, setSteps } = useOnboardingStore();

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Shortcuts state
    const [showShortcuts, setShowShortcuts] = useState(false);

    useKeyboardShortcuts({
        '?': () => setShowShortcuts(true), // Shift + /
        'shift+/': () => setShowShortcuts(true), // Fallback
        'alt+n': () => router.push('/project/builder'),
        'ctrl+s': (e) => {
            e.preventDefault(); // STOP browser "Save Page As"
            // Dispatch event for active components to handle
            window.dispatchEvent(new CustomEvent('jstar:save'));
        },
        'meta+s': (e) => { // Mac support
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('jstar:save'));
        }
    });

    // Inject user data into SupportContext
    const { setUser } = useSupport();
    useEffect(() => {
        if (user) {
            setUser({
                name: user.name,
                email: user.email,
                id: user.id
            });
        }
    }, [user, setUser]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.href = "/auth/login";
                },
            },
        });
    };

    const handleStartTour = () => {
        setSteps([
            {
                id: 'welcome',
                targetId: 'shell-header-title',
                title: 'Welcome to J-Star',
                content: 'This is your creative dashboard. Manage your projects and research here.',
                position: 'bottom'
            },
            {
                id: 'new-project',
                targetId: 'shell-new-project-btn',
                title: 'Start Building',
                content: 'Ready to start? Click here to launch a new project builder.',
                position: 'bottom'
            },
            {
                id: 'chat-hub',
                targetId: 'shell-chat-hub-btn',
                title: 'AI Assistant',
                content: 'Need help? Chat with Jay or Nengi to brainstorm ideas.',
                position: 'bottom'
            }
        ]);
        startTour();
        setIsDropdownOpen(false);
    };

    return (
        <div className={cn("bg-dark min-h-screen text-white font-sans md:pb-0", !hideBottomNav && "pb-[calc(6rem+env(safe-area-inset-bottom))]")}>
            {/* Header */}
            <header className="flex justify-between items-center px-4 py-3 md:px-6 md:py-6 sticky top-0 bg-dark/80 backdrop-blur-md z-40 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold font-display" id="shell-header-title">
                            {headerContent ? (
                                <div className="flex items-center gap-2">
                                    <Link href="/dashboard" className="hidden md:block font-normal text-gray-400 hover:text-white transition-colors">
                                        My Projects
                                    </Link>
                                    <Link href="/dashboard" aria-label="My Projects" className="md:hidden text-gray-400 hover:text-white transition-colors">
                                        <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
                                    </Link>
                                    <span className="text-gray-600">/</span>
                                </div>
                            ) : "My Projects"}
                        </h1>
                        {!headerContent && (
                            <p className="text-xs text-gray-400">Welcome back, {user.name?.split(" ")[0]}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* HUB Button - Desktop Only (Hybrid Routing) */}
                    {!isHub && (
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            id="shell-chat-hub-btn"
                            className="hidden md:flex text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            <Link href={hasActiveProject ? "/hub" : "/chat"}>
                                <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                                {hasActiveProject ? "AI Hub" : "Start Chat"}
                            </Link>
                        </Button>
                    )}

                    {/* Back to Dashboard Button - Validation: Not on Dashboard */}
                    {!isDashboard && (
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="hidden md:flex text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            <Link href="/dashboard">
                                <LayoutDashboard className="w-4 h-4 mr-2" aria-hidden="true" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    )}

                    {/* Desktop Project Button - Only show on Dashboard */}
                    {isDashboard && (
                        <Button
                            asChild
                            variant="default"
                            size="sm"
                            id="shell-new-project-btn"
                            className="hidden md:flex bg-primary hover:bg-primary/90 text-white font-bold"
                        >
                            <Link href="/project/builder">
                                {hasActiveProject ? (
                                    <>
                                        <Hammer className="w-4 h-4 mr-2" aria-hidden="true" />
                                        Continue Project
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                                        New Project
                                    </>
                                )}
                            </Link>
                        </Button>
                    )}

                    {/* Custom Header Content (e.g. Builder Progress) */}
                    {headerContent}

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-label="Open user menu"
                            className="focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-full"
                        >
                            <UserAvatar
                                name={user.name}
                                image={user.image}
                                size="md"
                                className="w-8 h-8 text-xs md:w-10 md:h-10 md:text-sm"
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-dark/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="px-4 py-2 border-b border-white/5 mb-1">
                                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 truncate">User</p>
                                </div>
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <UserIcon className="w-4 h-4" />
                                    Profile
                                </Link>
                                
                                <button
                                    onClick={handleStartTour}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                                >
                                    <PlayCircle className="w-4 h-4" />
                                    Start Tour
                                </button>

                                <button
                                    onClick={() => {
                                        setShowShortcuts(true);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                                >
                                    <Keyboard className="w-4 h-4" />
                                    Shortcuts
                                </button>

                                <SupportButton onClose={() => setIsDropdownOpen(false)} />
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={cn(
                "mx-auto",
                !noPadding && "px-6 py-6 space-y-8",
                fullWidth ? "w-full" : "max-w-lg md:max-w-4xl"
            )}>
                {children}
            </main>

            {/* Mobile Navigation */}
            {!hideBottomNav && <MobileBottomNav hasActiveProject={hasActiveProject} />}

            <OnboardingTour />
            <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </div>
    );
};
