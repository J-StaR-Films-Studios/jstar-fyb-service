'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { UploadDocumentForm } from './UploadDocumentForm';

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onUploadSuccess: (doc: any) => void;
}

export function UploadDocumentModal({
    isOpen,
    onClose,
    projectId,
    onUploadSuccess
}: UploadDocumentModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[101]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-xl font-display font-bold text-white">Add New Source</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <UploadDocumentForm
                                projectId={projectId}
                                onUploadSuccess={(doc) => {
                                    onUploadSuccess(doc);
                                    onClose();
                                }}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
