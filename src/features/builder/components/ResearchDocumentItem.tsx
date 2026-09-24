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
    CheckCircle,
    XCircle,
    BrainCircuit,
    Sparkles,
    Loader2,
    RefreshCw,
    DownloadCloud
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocumentItem({
    doc,
    onView,
    onDelete,
    onRetry,
    onManualFetch,
    isExtracting = false,
}: {
    doc: any;
    onView: () => void;
    onDelete: () => void;
    onRetry?: () => void;
    onManualFetch?: () => void;
    isExtracting?: boolean;
}) {
    const isAcademic = doc.sourceType === 'ACADEMIC';
    const isWeb = doc.sourceType === 'WEB';
    const hasOpenAccess = doc.openAccessUrl && doc.openAccessUrl.length > 0;

    // Determine icon and color based on document type and access
    const getIcon = () => {
        if (isAcademic) {
            if (hasOpenAccess) {
                return <FileText className="w-4 h-4 text-ink" />;
            }
            return <Lock className="w-4 h-4 text-orange-400" />;
        }
        if (isWeb) {
            return <Globe className="w-4 h-4 text-blue-400" />;
        }
        return <FileText className="w-4 h-4 text-purple-400" />;
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

    const getStatusConfig = (status: string, importedToFileSearch: boolean, importError: boolean) => {
        if (status === "PROCESSED" && importedToFileSearch) {
            return { icon: <BrainCircuit className="w-3 h-3" />, text: "AI Ready", className: "text-ink" };
        }
        if (importError) {
            return { icon: <XCircle className="w-3 h-3" />, text: "Sync Failed", className: "text-ink" };
        }
        switch (status) {
            case "PROCESSED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Ready", className: "text-ink" };
            case "COMPLETED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Ready", className: "text-ink" };
            case "INDEXED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Indexed", className: "text-ink" };
            case "FAILED": return { icon: <XCircle className="w-3 h-3" />, text: "Failed", className: "text-ink" };
            case "EXTRACTION_FAILED": return { icon: <XCircle className="w-3 h-3" />, text: "Extract Failed", className: "text-ink" };
            case "ERROR": return { icon: <XCircle className="w-3 h-3" />, text: "Error", className: "text-ink" };
            case "PENDING": return { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Processing", className: "text-ink-muted" };
            case "PROCESSING": return { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Processing", className: "text-ink-muted" };
            default: return { icon: <Sparkles className="w-3 h-3" />, text: status || "Unknown", className: "text-ink-muted" };
        }
    };

    const statusObj = getStatusConfig(doc.status, doc.importedToFileSearch, !!doc.importError);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-writing hover:bg-selection border border-rule hover:border-rule rounded-md p-3 transition-all duration-200"
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
                        className="text-sm font-medium text-ink hover:text-ink line-clamp-1 transition-colors block"
                        title={doc.title || doc.fileName}
                    >
                        {doc.title || doc.fileName}
                    </a>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Source Type Badge */}
                        {isAcademic && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-ink rounded text-xs">
                                <BookOpen className="w-2.5 h-2.5" />
                                {hasOpenAccess ? 'Free PDF' : 'Paywalled'}
                            </span>
                        )}
                        {isWeb && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-ink rounded text-xs">
                                <Globe className="w-2.5 h-2.5" />
                                Web
                            </span>
                        )}
                        {!isAcademic && !isWeb && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-ink rounded text-xs">
                                <Upload className="w-2.5 h-2.5" />
                                Uploaded
                            </span>
                        )}

                        {/* Citation Count */}
                        {isAcademic && doc.citationCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-ink rounded text-xs">
                                <Quote className="w-2.5 h-2.5" />
                                {doc.citationCount.toLocaleString()}
                            </span>
                        )}

                        {/* Year */}
                        {doc.year && <span className="text-xs text-ink-muted">{doc.year}</span>}

                        {/* Status */}
                        <span className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs bg-selection", statusObj.className)}>
                            {statusObj.icon}
                            {statusObj.text}
                        </span>
                    </div>

                    {/* Snippet (for web sources) */}
                    {isWeb && doc.snippet && (
                        <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">{doc.snippet}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-rule">
                {/* Open Access PDF */}
                {hasOpenAccess && (
                    <a
                        href={doc.openAccessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 text-ink text-xs font-medium transition-colors"
                    >
                        <Download className="w-3 h-3" />
                        PDF
                    </a>
                )}

                {/* View (for processed documents) */}
                {(doc.status === 'PROCESSED' || doc.status === 'PENDING' || doc.status === 'PROCESSING' || doc.status === 'INDEXED' || doc.status === 'UPLOADED') && (
                    <button
                        onClick={onView}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-selection hover:bg-selection text-ink-muted text-xs transition-colors"
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
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-ink text-xs transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}

                {/* Retry */}
                {onRetry && (doc.status === 'FAILED' || doc.status === 'EXTRACTION_FAILED' || !!doc.importError) && (
                    <button
                        onClick={onRetry}
                        disabled={isExtracting}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-ink text-xs transition-colors"
                    >
                        <RefreshCw className={cn("w-3 h-3", isExtracting && "animate-spin")} />
                        Retry Sync
                    </button>
                )}

                {/* Manual Fetch PDF */}
                {onManualFetch && hasOpenAccess && doc.status !== 'PENDING' && doc.status !== 'PROCESSING' && (
                    <button
                        onClick={onManualFetch}
                        disabled={isExtracting}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-ink text-xs font-medium transition-colors ml-1"
                        title="Manually force a PDF download attempt"
                    >
                        {isExtracting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <DownloadCloud className="w-3 h-3" />
                        )}
                        {doc.fileData ? 'Refetch PDF' : 'Fetch PDF'}
                    </button>
                )}

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-500/10 text-ink-muted hover:text-ink text-xs transition-colors ml-auto"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    );
}
