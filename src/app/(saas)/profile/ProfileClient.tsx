'use client';

import { signOut } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function ProfileClient() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignOut = async () => {
        setIsLoading(true);
        try {
            await signOut({
                fetchOptions: {
                    onSuccess: () => {
                        window.location.href = "/auth/login";
                    },
                },
            });
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full flex min-h-11 items-center justify-center gap-2 rounded-md border border-rule bg-writing px-6 py-3 font-bold text-ink transition-colors hover:bg-selection disabled:cursor-not-allowed disabled:opacity-60"
        >
            <LogOut className="w-5 h-5" />
            {isLoading ? "Signing out..." : "Sign out"}
        </button>
    );
}
