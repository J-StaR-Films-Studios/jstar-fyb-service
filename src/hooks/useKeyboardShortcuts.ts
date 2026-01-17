import { useEffect } from 'react';

type KeyCombo = string; // e.g., 'ctrl+s', 'meta+k'
type Handler = (event: KeyboardEvent) => void;

export const useKeyboardShortcuts = (shortcuts: Record<KeyCombo, Handler>) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if input/textarea is focused, unless it's a modifier combo like Ctrl+S
            const target = event.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            
            const keys = [];
            if (event.ctrlKey) keys.push('ctrl');
            if (event.metaKey) keys.push('meta'); // Treat meta like ctrl for Mac usually, or separate
            if (event.altKey) keys.push('alt');
            if (event.shiftKey) keys.push('shift');
            
            // Normalize key
            const key = event.key.toLowerCase();
            
            // Handle shift+? specifically as just "?"
            if (event.key === '?') {
                if (shortcuts['?']) {
                    event.preventDefault();
                    shortcuts['?'](event);
                    return;
                }
            }

            if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
                keys.push(key);
            }

            const combo = keys.join('+');
            
            // Check specific overrides for Inputs (e.g. Ctrl+Enter)
            // Or if it's a global command that should work everywhere (Ctrl+K, Ctrl+/)
            // For now, allow all if modifiers are present, otherwise block inputs
            if (isInput && keys.length === 0) return;

            if (shortcuts[combo]) {
                // FORCE prevention of default browser behavior for registered shortcuts
                // This is critical for overriding things like Ctrl+S or Ctrl+P
                event.preventDefault();
                shortcuts[combo](event);
            }
            
            // Handle mac "Cmd" as "Ctrl" for convenience?
            if (event.metaKey && !event.ctrlKey) {
                 const macCombo = combo.replace('meta', 'ctrl');
                 if (shortcuts[macCombo]) {
                     shortcuts[macCombo](event);
                 }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
