'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Library,
    FileText,
    Lock,
    Globe,
    BookOpen,
    Upload,
    ArrowRight,
    Plus,
    Loader2,
} from 'lucide-react';
import { useBuilderLayout } from '../context/BuilderLayoutContext';
import { useBuilderStore } from '../store/useBuilderStore';
import { cn } from '@/lib/utils';

/**
 * ResearchSourcesCard
 * 
 * Compact card showing research sources summary
 * Displays count and mini preview list, with buttons to view all or add new
 */
export function ResearchSourcesCard() {
    const { openResearchPanel } = useBuilderLayout();
    const projectId = useBuilderStore((s) => s.data.projectId);

    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch documents
    useEffect(() => {
        if (!projectId) return;

        const fetchDocuments = async () => {
            try {
                const res = await fetch(`/api/documents?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setDocuments(data.documents || []);
                }
            } catch (error) {
                console.error('Failed to fetch documents:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocuments();
    }, [projectId]);

    // Categorize documents
    const { academicPapers, webSources, uploadedDocs } = useMemo(() => {
        const academic: any[] = [];
        const web: any[] = [];
        const uploaded: any[] = [];

        for (const doc of documents) {
            if (doc.sourceType === 'ACADEMIC') {
                academic.push(doc);
            } else if (doc.sourceType === 'WEB') {
                web.push(doc);
            } else {
                uploaded.push(doc);
            }
        }

        return {
            academicPapers: academic,
            webSources: web,
            uploadedDocs: uploaded,
        };
    }, [documents]);

    const papersCount = academicPapers.length + webSources.length;
    const uploadedCount = uploadedDocs.length;

    // Get preview documents (max 3)
    const previewDocs = documents.slice(0, 3);

    // Get icon based on document type
    const getIcon = (doc: any) => {
        const isAcademic = doc.sourceType === 'ACADEMIC';
        const isWeb = doc.sourceType === 'WEB';
        const hasOpenAccess = doc.openAccessUrl && doc.openAccessUrl.length > 0;

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

    const getIconBg = (doc: any) => {
        const isAcademic = doc.sourceType === 'ACADEMIC';
        const isWeb = doc.sourceType === 'WEB';
        const hasOpenAccess = doc.openAccessUrl && doc.openAccessUrl.length > 0;

        if (isAcademic) {
            return hasOpenAccess ? 'bg-red-500/10' : 'bg-orange-500/10';
        }
        if (isWeb) {
            return 'bg-blue-500/10';
        }
        return 'bg-purple-500/10';
    };

    if (isLoading) {
        return (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Research Sources</h3>
                </div>
                {documents.length > 0 && (
                    <span className="text-xs text-gray-400">
                        {papersCount} {papersCount === 1 ? 'paper' : 'papers'} · {uploadedCount} uploaded
                    </span>
                )}
            </div>

            {/* Document Preview List */}
            {previewDocs.length > 0 ? (
                <div className="space-y-2">
                    {previewDocs.map((doc) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <div className={cn('shrink-0 w-7 h-7 rounded flex items-center justify-center', getIconBg(doc))}>
                                {getIcon(doc)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">
                                    {doc.title || doc.fileName}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">
                                    {doc.sourceType === 'ACADEMIC' ? 'Academic Paper' : doc.sourceType === 'WEB' ? 'Web Source' : 'Uploaded'}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No research sources yet</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                    onClick={openResearchPanel}
                    disabled={documents.length === 0}
                    className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
                        documents.length > 0
                            ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    )}
                >
                    View All
                    <ArrowRight className="w-3 h-3" />
                </button>
                <button
                    onClick={openResearchPanel}
                    className="py-2 px-3 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 flex items-center justify-center gap-1 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Source
                </button>
            </div>
        </div>
    );
}
