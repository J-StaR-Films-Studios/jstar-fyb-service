'use client';

import { useState, useEffect } from 'react';
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
    Loader2,
    Filter,
} from 'lucide-react';
import { useBuilderLayout } from '../context/BuilderLayoutContext';
import { useBuilderStore } from '../store/useBuilderStore';
import { cn } from '@/lib/utils';
import { ResearchModal } from '@/features/research/components/ResearchModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { DocumentItem } from './ResearchDocumentItem';
import { DirectUploadWrapper } from './DirectUploadWrapper';
import { useResearchDocuments } from '@/features/research/hooks/useResearchDocuments';

type ViewMode = 'all' | 'papers' | 'web' | 'uploaded';
type AccessFilter = 'all' | 'open' | 'paywalled';

/**
 * FloatingResearchPanel
 * 
 * Slide-out panel from right (400px desktop, full mobile)
 * Shows research documents with tabs, search, and actions
 */
export function FloatingResearchPanel() {
    const { isResearchPanelOpen, closeResearchPanel } = useBuilderLayout();
    const projectId = useBuilderStore((s) => s.data.projectId);

    // UI-only state (stays local)
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
    const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Shared Hook ─────────────────────────────────────────
    // Map panel's viewMode ('papers') to hook's viewMode ('academic')
    const hookViewMode = viewMode === 'papers' ? 'academic' : viewMode;

    const {
        filteredDocs,
        extractingDocs,
        isProcessingBatch,
        counts: hookCounts,
        fetchDocuments,
        handleExtract,
        handleManualFetch,
        handleDelete,
        handleResearchComplete: hookResearchComplete,
    } = useResearchDocuments({
        projectId: projectId || '',
        searchQuery,
        viewMode: hookViewMode,
        accessFilter,
    });

    // Remap hook counts to include the 'papers' key used in the panel
    const counts = {
        all: hookCounts.all,
        papers: hookCounts.academic,
        web: hookCounts.web,
        uploaded: hookCounts.uploaded,
    };

    // Fetch when panel opens
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

    // ── Handlers ────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!deleteModal.docId) return;
        setIsDeleting(true);
        try {
            await handleDelete(deleteModal.docId);
            setDeleteModal({ isOpen: false, docId: null });
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUploadSuccess = async (doc: any) => {
        await fetchDocuments();
        if (doc && doc.id) {
            handleExtract(doc.id);
        }
    };

    const handleResearchComplete = async (savedDocs?: any[], shouldSync?: boolean) => {
        setIsResearchModalOpen(false);

        if (shouldSync && savedDocs && savedDocs.length > 0) {
            const docIds = savedDocs.map((d) => d.id);
            await hookResearchComplete(docIds);
        } else {
            await fetchDocuments();
        }
    };

    // ── Tab & Filter Config ─────────────────────────────────
    const tabs = [
        { id: 'all' as ViewMode, label: 'All', count: counts.all },
        { id: 'papers' as ViewMode, label: 'Papers', count: counts.papers, icon: BookOpen },
        { id: 'web' as ViewMode, label: 'Web', count: counts.web, icon: Globe },
        { id: 'uploaded' as ViewMode, label: 'Uploaded', count: counts.uploaded, icon: Upload },
    ];

    const accessFilters = [
        { id: "all" as AccessFilter, label: "All", icon: Filter },
        { id: "open" as AccessFilter, label: "Free PDF", icon: Unlock },
        { id: "paywalled" as AccessFilter, label: "Paywalled", icon: Lock },
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
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111118]/95 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                    Research Library
                                </h2>
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

                        {/* Processing Banner */}
                        <AnimatePresence>
                            {(isProcessingBatch || Object.values(extractingDocs).some(Boolean) || uploadingFiles.length > 0) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-purple-500/10 border-b border-purple-500/20"
                                >
                                    <div className="px-6 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                                            <span className="text-xs font-medium text-purple-200">
                                                AI is processing documents. Please do not close the page.
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tabs */}
                        <div className="px-6 py-4 flex gap-2 border-b border-white/5 overflow-x-auto custom-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewMode(tab.id)}
                                    className={cn(
                                        'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5',
                                        viewMode === tab.id
                                            ? 'bg-purple-500/10 text-white border border-purple-500/20'
                                            : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                    )}
                                >
                                    {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                                    {tab.label}
                                    <span className={cn(
                                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px]",
                                        viewMode === tab.id ? "bg-purple-500/30 text-purple-200" : "bg-white/10 text-gray-400"
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Access Filters (only for papers) */}
                        {viewMode === 'papers' && (
                            <div className="px-6 py-2 flex gap-2 border-b border-white/5 overflow-x-auto bg-[#111118]/80">
                                {accessFilters.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setAccessFilter(filter.id)}
                                        className={cn(
                                            'px-3 py-1 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1.5',
                                            accessFilter === filter.id
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                        )}
                                    >
                                        <filter.icon className="w-3 h-3" />
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        )}

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
                            {filteredDocs.length > 0 || uploadingFiles.length > 0 ? (
                                <>
                                    {uploadingFiles.map((fileName, idx) => (
                                        <div key={`uploading-${idx}`} className="group bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-3 transition-all duration-200 animate-pulse">
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10">
                                                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[36px]">
                                                    <p className="text-sm font-medium text-white line-clamp-1">{fileName}</p>
                                                    <span className="text-[10px] text-purple-300">Uploading...</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredDocs.map((doc) => (
                                        <DocumentItem
                                            key={doc.id}
                                            doc={doc}
                                            onView={() => setSelectedDocument(doc)}
                                            onDelete={() => setDeleteModal({ isOpen: true, docId: doc.id })}
                                            onRetry={() => handleExtract(doc.id)}
                                            onManualFetch={() => handleManualFetch(doc.id)}
                                            isExtracting={!!extractingDocs[doc.id]}
                                        />
                                    ))}
                                </>
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
                            {projectId && (
                                <DirectUploadWrapper
                                    projectId={projectId}
                                    onUploadStart={(fileName) => setUploadingFiles(prev => [fileName, ...prev])}
                                    onUploadEnd={(fileName) => setUploadingFiles(prev => prev.filter(f => f !== fileName))}
                                    onUploadSuccess={handleUploadSuccess}
                                >
                                    {({ onClick, isUploading }) => (
                                        <button
                                            onClick={onClick}
                                            disabled={isUploading}
                                            className="w-full py-3 border border-white/10 rounded-xl mt-3 text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {isUploading ? "Uploading..." : "Upload Document"}
                                        </button>
                                    )}
                                </DirectUploadWrapper>
                            )}
                        </div>
                    </motion.aside>

                    {/* Modals */}
                    {projectId && (
                        <ResearchModal
                            isOpen={isResearchModalOpen}
                            onClose={() => setIsResearchModalOpen(false)}
                            projectId={projectId}
                            projectTopic={useBuilderStore.getState().data.topic}
                            onComplete={handleResearchComplete}
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
