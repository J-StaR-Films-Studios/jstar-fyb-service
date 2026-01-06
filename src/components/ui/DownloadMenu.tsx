'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, FileType } from 'lucide-react';

export interface DownloadMenuProps {
    onSelect: (format: 'markdown' | 'docx') => void;
    label?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    className?: string;
    showLabelOnMobile?: boolean; // If true, label text is shown even on small screens (if space permits)
}

export const DownloadMenu = ({ onSelect, label, icon, disabled, className, showLabelOnMobile = false }: DownloadMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={className || "p-2 text-gray-400 hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}
                title="Download options"
            >
                {icon || <Download className="w-5 h-5" />}
                {label && <span className={showLabelOnMobile ? "ml-2" : "hidden sm:inline ml-2"}>{label}</span>}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                        onClick={() => { onSelect('markdown'); setIsOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4 text-blue-400" />
                        Markdown (.md)
                    </button>
                    <button
                        onClick={() => { onSelect('docx'); setIsOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 border-t border-white/5"
                    >
                        <FileType className="w-4 h-4 text-blue-600" />
                        Word Document (.docx)
                    </button>
                </div>
            )}
        </div>
    );
};
