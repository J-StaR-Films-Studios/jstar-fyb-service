'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * FloatingChatFAB
 * 
 * A floating gradient chat button that provides quick access to the AI assistant.
 * 
 * Position:
 * - Mobile: bottom-20 (above mobile nav), right-4
 * - Desktop: bottom-6, right-6
 * 
 * Styling:
 * - Gradient from primary to accent
 * - Glow effect with shadow-primary/20
 * - Hover scale and glow intensify
 */
export function FloatingChatFAB() {
    return (
        <Link
            href="/hub"
            className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all z-30 flex items-center justify-center group"
            aria-label="Open AI Assistant chat"
        >
            <MessageCircle className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />

            {/* Glow ring effect */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-30 blur-md transition-opacity" aria-hidden="true" />

            {/* Pulse animation ring */}
            <span
                className="absolute inset-0 rounded-full bg-primary/30 animate-ping"
                style={{ animationDuration: '2s' }}
                aria-hidden="true"
            />
        </Link>
    );
}
