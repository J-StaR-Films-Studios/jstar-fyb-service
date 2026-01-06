'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, FileType, Check, Settings2, Type, AlignJustify, ChevronDown } from 'lucide-react';
import { ExportOptions } from '@/lib/export-service';

interface DownloadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (format: 'markdown' | 'docx', options: ExportOptions) => void;
    title?: string;
}

export const DownloadOptionsModal = ({ isOpen, onClose, onConfirm, title = "Export Document" }: DownloadOptionsModalProps) => {
    const [format, setFormat] = useState<'markdown' | 'docx'>('docx');

    // Styling Options
    const [font, setFont] = useState("Times New Roman");
    const [fontSize, setFontSize] = useState(12);
    const [lineSpacing, setLineSpacing] = useState(1.5);

    if (!isOpen) return null;

    const handleDownload = () => {
        onConfirm(format, {
            font,
            fontSize,
            lineSpacing,
            includeTitle: true
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f0f15] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Settings2 className="w-6 h-6 text-primary" />
                    {title}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    Customize your document format and styling.
                </p>

                {/* Format Selection */}
                <div className="space-y-4 mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">File Format</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setFormat('docx')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${format === 'docx'
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <FileType className="w-8 h-8" />
                            <span className="font-bold text-sm">Word (.docx)</span>
                            {format === 'docx' && <Check className="w-4 h-4 absolute top-3 right-3 text-blue-500" />}
                        </button>
                        <button
                            onClick={() => setFormat('markdown')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${format === 'markdown'
                                ? 'bg-purple-600/10 border-purple-500 text-purple-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <FileText className="w-8 h-8" />
                            <span className="font-bold text-sm">Markdown (.md)</span>
                            {format === 'markdown' && <Check className="w-4 h-4 absolute top-3 right-3 text-purple-500" />}
                        </button>
                    </div>
                </div>

                {/* DOCX Styling Options */}
                {format === 'docx' && (
                    <div className="space-y-4 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="h-px bg-white/10 my-4" />

                        {/* Font Family */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Type className="w-3 h-3" /> Font Family
                            </label>
                            <div className="relative">
                                <select
                                    value={font}
                                    onChange={(e) => setFont(e.target.value)}
                                    className="w-full bg-[#1a1a20] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <option value="Times New Roman" className="bg-[#1a1a20]">Times New Roman (Academic)</option>
                                    <option value="Arial" className="bg-[#1a1a20]">Arial (Standard)</option>
                                    <option value="Calibri" className="bg-[#1a1a20]">Calibri (Modern)</option>
                                    <option value="Georgia" className="bg-[#1a1a20]">Georgia (Serif)</option>
                                    <option value="Roboto" className="bg-[#1a1a20]">Roboto (Clean)</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-2.5 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Font Size */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size (pt)</label>
                                <div className="relative">
                                    <select
                                        value={fontSize}
                                        onChange={(e) => setFontSize(Number(e.target.value))}
                                        className="w-full bg-[#1a1a20] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <option value={10} className="bg-[#1a1a20]">10 pt</option>
                                        <option value={11} className="bg-[#1a1a20]">11 pt</option>
                                        <option value={12} className="bg-[#1a1a20]">12 pt (Standard)</option>
                                        <option value={14} className="bg-[#1a1a20]">14 pt</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            {/* Line Spacing */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <AlignJustify className="w-3 h-3" /> Spacing
                                </label>
                                <div className="relative">
                                    <select
                                        value={lineSpacing}
                                        onChange={(e) => setLineSpacing(Number(e.target.value))}
                                        className="w-full bg-[#1a1a20] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <option value={1} className="bg-[#1a1a20]">Single (1.0)</option>
                                        <option value={1.15} className="bg-[#1a1a20]">1.15</option>
                                        <option value={1.5} className="bg-[#1a1a20]">1.5 Lines</option>
                                        <option value={2} className="bg-[#1a1a20]">Double (2.0)</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-2.5 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleDownload}
                    className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-2 transition-all mt-2"
                >
                    <Download className="w-5 h-5" />
                    Download Document
                </button>
            </div>
        </div>,
        document.body
    );
};
