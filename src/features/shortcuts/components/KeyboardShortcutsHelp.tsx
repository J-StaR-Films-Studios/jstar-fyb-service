'use client';

import { X, Keyboard } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { key: 'Ctrl + N', description: 'Create new project' },
    { key: 'Ctrl + S', description: 'Save current changes' },
    { key: 'Ctrl + /', description: 'Show this help' },
    { key: 'Esc', description: 'Close modal / Cancel' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-dark border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2">
                                <Keyboard className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-white">Keyboard Shortcuts</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-2">
                            {SHORTCUTS.map((s) => (
                                <div key={s.key} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-lg transition-colors">
                                    <span className="text-sm text-gray-300 font-medium">{s.description}</span>
                                    <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono text-gray-400 border border-white/10 min-w-[3rem] text-center shadow-sm">
                                        {s.key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
