'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    FileText,
    Lock,
    Unlock,
    Globe,
    BookOpen,
    Upload,
    Sparkles,
    ExternalLink,
    Download,
    Quote,
    Loader2,
    RefreshCw,
    Eye,
    Trash2,
} from 'lucide-react';
import { useBuilderLayout } from '../context/BuilderLayoutContext';
import { useBuilderStore } from '../store/useBuilderStore';
import { cn } from '@/lib/utils';
import { ResearchModal } from '@/features/research/components/ResearchModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DocumentViewerModal } from './DocumentViewerModal';

type ViewMode = 'all' | 'papers' | 'uploaded';

/**
 * FloatingResearchPanel
 * 
 * Slide-out panel from right (400px desktop, full mobile)
 * Shows research documents with tabs, search, and actions
 */
export function FloatingResearchPanel() {
    const { isResearchPanelOpen, closeResearchPanel } = useBuilderLayout();
    const projectId = useBuilderStore((s) => s.data.projectId);

    // Local state
    const [documents, setDocuments] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch documents
    const fetchDocuments = useCallback(async () => {
        if (!projectId) return;
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
    }, [projectId]);

    useEffect(() => {
        if (isResearchPanelOpen) {
            fetchDocuments();
        }
    }, [isResearchPanelOpen, fetchDocuments]);

    // Body scroll lock
    useEffect(() => {
        if (isResearchPanelOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isResearchPanelOpen]);

    // Escape key handler
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isResearchPanelOpen) {
                closeResearchPanel();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isResearchPanelOpen, closeResearchPanel]);

    // Categorize documents
    const { academicPapers, webSources, uploadedDocs, counts } = useMemo(() => {
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

        // Sort academic by citation count
        academic.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

        return {
            academicPapers: academic,
            webSources: web,
            uploadedDocs: uploaded,
            counts: {
                all: documents.length,
                papers: academic.length + web.length,
                uploaded: uploaded.length,
            },
        };
    }, [documents]);

    // Filter documents based on view mode and search
    const filteredDocs = useMemo(() => {
        let docs: any[] = [];
        switch (viewMode) {
            case 'papers':
                docs = [...academicPapers, ...webSources];
                break;
            case 'uploaded':
                docs = uploadedDocs;
                break;
            default:
                docs = documents;
        }

        if (!searchQuery) return docs;
        return docs.filter(
            (doc) =>
                doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [viewMode, academicPapers, webSources, uploadedDocs, documents, searchQuery]);

    const handleDeleteConfirm = async () => {
        if (!deleteModal.docId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/documents/${deleteModal.docId}`, { method: 'DELETE' });
            if (res.ok) {
                setDocuments((prev) => prev.filter((doc) => doc.id !== deleteModal.docId));
                setDeleteModal({ isOpen: false, docId: null });
            }
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const tabs = [
        { id: 'all' as ViewMode, label: 'All Sources', count: counts.all },
        { id: 'papers' as ViewMode, label: 'Papers', count: counts.papers },
        { id: 'uploaded' as ViewMode, label: 'Uploaded', count: counts.uploaded },
    ];

    return (
        <AnimatePresence>
            {isResearchPanelOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                        onClick={closeResearchPanel}
                    />

                    {/* Panel */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 w-full md:w-[400px] h-full bg-[#111118] border-l border-white/10 z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111118]/95 backdrop-blur-md sticky top-0">
                            <div>
                                <h2 className="text-xl font-display font-bold text-white">Research Library</h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    {counts.all} relevant {counts.all === 1 ? 'source' : 'sources'} found
                                </p>
                            </div>
                            <button
                                onClick={closeResearchPanel}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 py-4 flex gap-2 border-b border-white/5 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewMode(tab.id)}
                                    className={cn(
                                        'px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap',
                                        viewMode === tab.id
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    )}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search sources..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Document List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-3 pb-36">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                </div>
                            ) : filteredDocs.length > 0 ? (
                                filteredDocs.map((doc) => (
                                    <DocumentItem
                                        key={doc.id}
                                        doc={doc}
                                        onView={() => setSelectedDocument(doc)}
                                        onDelete={() => setDeleteModal({ isOpen: true, docId: doc.id })}
                                    />
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400 mb-1">
                                        {searchQuery ? 'No matching sources' : 'No research sources yet'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {searchQuery ? 'Try a different search' : 'Run Deep Research or upload documents'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-[#111118] absolute bottom-0 w-full">
                            <button
                                onClick={() => setIsResearchModalOpen(true)}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                            >
                                <Sparkles className="w-4 h-4" />
                                Deep Research
                            </button>
                            <button
                                onClick={() => {
                                    // For now, just show a message - upload functionality handled elsewhere
                                    closeResearchPanel();
                                }}
                                className="w-full py-3 border border-white/10 rounded-xl mt-3 text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                Upload Document
                            </button>
                        </div>
                    </motion.aside>

                    {/* Modals */}
                    {projectId && (
                        <ResearchModal
                            isOpen={isResearchModalOpen}
                            onClose={() => setIsResearchModalOpen(false)}
                            projectId={projectId}
                            projectTopic={useBuilderStore.getState().data.topic}
                            onComplete={() => {
                                fetchDocuments();
                                setIsResearchModalOpen(false);
                            }}
                        />
                    )}

                    <DocumentViewerModal
                        researchDoc={selectedDocument}
                        isOpen={!!selectedDocument}
                        onClose={() => setSelectedDocument(null)}
                    />

                    <ConfirmModal
                        isOpen={deleteModal.isOpen}
                        onClose={() => setDeleteModal({ isOpen: false, docId: null })}
                        onConfirm={handleDeleteConfirm}
                        title="Delete Document"
                        message="This will permanently remove the document from your research library."
                        confirmText="Delete"
                        type="danger"
                        isLoading={isDeleting}
                    />
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Document item in the list
 */
function DocumentItem({
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
