'use client';

import { motion } from 'framer-motion';
import {
    FileText,
    Lock,
    Globe,
    BookOpen,
    Upload,
    ExternalLink,
    Download,
    Quote,
    Eye,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocumentItem({
    doc,
    onView,
    onDelete,
}: {
    doc: any;
    onView: () => void;
    onDelete: () => void;
}) {
    const isAcademic = doc.sourceType === 'ACADEMIC';
    const isWeb = doc.sourceType === 'WEB';
    const hasOpenAccess = doc.openAccessUrl && doc.openAccessUrl.length > 0;

    // Determine icon and color based on document type and access
    const getIcon = () => {
        if (isAcademic) {
            if (hasOpenAccess) {
                return <FileText className="w-4 h-4 text-red-400" />;
            }
            return <Lock className="w-4 h-4 text-orange-400" />;
        }
        if (isWeb) {
            return <Globe className="w-4 h-4 text-blue-400" />;
        }
        return <Upload className="w-4 h-4 text-purple-400" />;
    };

    const getIconBg = () => {
        if (isAcademic) {
            return hasOpenAccess ? 'bg-red-500/10' : 'bg-orange-500/10';
        }
        if (isWeb) {
            return 'bg-blue-500/10';
        }
        return 'bg-purple-500/10';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-3 transition-all duration-200"
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', getIconBg())}>
                    {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <a
                        href={doc.fileUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-purple-300 line-clamp-1 transition-colors block"
                        title={doc.title || doc.fileName}
                    >
                        {doc.title || doc.fileName}
                    </a>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Source Type Badge */}
                        {isAcademic && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[10px]">
                                <BookOpen className="w-2.5 h-2.5" />
                                {hasOpenAccess ? 'Free PDF' : 'Paywalled'}
                            </span>
                        )}
                        {isWeb && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-300 rounded text-[10px]">
                                <Globe className="w-2.5 h-2.5" />
                                Web
                            </span>
                        )}
                        {!isAcademic && !isWeb && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[10px]">
                                <Upload className="w-2.5 h-2.5" />
                                Uploaded
                            </span>
                        )}

                        {/* Citation Count */}
                        {isAcademic && doc.citationCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[10px]">
                                <Quote className="w-2.5 h-2.5" />
                                {doc.citationCount.toLocaleString()}
                            </span>
                        )}

                        {/* Year */}
                        {doc.year && <span className="text-[10px] text-gray-500">{doc.year}</span>}
                    </div>

                    {/* Snippet (for web sources) */}
                    {isWeb && doc.snippet && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{doc.snippet}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                {/* Open Access PDF */}
                {hasOpenAccess && (
                    <a
                        href={doc.openAccessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-300 text-[10px] font-medium transition-colors"
                    >
                        <Download className="w-3 h-3" />
                        PDF
                    </a>
                )}

                {/* View (for processed documents) */}
                {doc.status === 'PROCESSED' && (
                    <button
                        onClick={onView}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] transition-colors"
                    >
                        <Eye className="w-3 h-3" />
                        View
                    </button>
                )}

                {/* Open Source */}
                {doc.fileUrl && (
                    <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[10px] transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 text-[10px] transition-colors ml-auto"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    );
}
