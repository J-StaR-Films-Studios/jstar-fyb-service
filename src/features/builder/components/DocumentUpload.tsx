"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Link as LinkIcon, FileText, Loader2, Trash2, CheckCircle,
  XCircle, Eye, Sparkles, BrainCircuit, RefreshCw, Plus, BookOpen,
  Globe, Quote, Download, Lock, Unlock, ExternalLink, Search, Zap,
  ArrowRight, Filter, DownloadCloud
} from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResearchDocument } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ResearchModal } from "@/features/research/components/ResearchModal";
import { useResearchDocuments } from "@/features/research/hooks/useResearchDocuments";

type ViewMode = "all" | "academic" | "web" | "uploaded";
type AccessFilter = "all" | "open" | "paywalled";

export function DocumentUpload({ projectId, searchQuery = "" }: { projectId: string, searchQuery?: string }) {
  // ── UI-only state ─────────────────────────────────────
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [selectedDocument, setSelectedDocument] = useState<ResearchDocument | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean; result?: 'success' | 'error' }>({ isOpen: false });

  // ── Shared Hook ───────────────────────────────────────
  const {
    filteredDocs,
    extractingDocs,
    isProcessingBatch,
    counts,
    fetchDocuments,
    handleExtract,
    handleManualFetch,
    handleDelete,
    handleSyncAll,
    handleResearchComplete: hookResearchComplete,
    handleUpload: hookUpload,
  } = useResearchDocuments({
    projectId,
    searchQuery,
    viewMode,
    accessFilter,
  });

  // ── Upload Handler ────────────────────────────────────
  const handleUpload = async () => {
    if (!file && !link) return;

    if (mode === "upload" && file) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

      if (file.size > MAX_FILE_SIZE) {
        alert("File exceeds 5MB limit. Please compress your PDF at ilovepdf.com/compress_pdf and try again.");
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert("Only PDF and DOCX files are allowed.");
        return;
      }
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("projectId", projectId);

    if (mode === "upload" && file) {
      formData.append("file", file);
    } else if (mode === "link" && link) {
      formData.append("link", link);
    }

    try {
      await hookUpload(formData);
      setFile(null);
      setLink("");
      setIsExpanded(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Sync Handler ──────────────────────────────────────
  const handleRetrySync = async () => {
    setSyncModal({ isOpen: true });
    const success = await handleSyncAll();
    setSyncModal({ isOpen: true, result: success ? 'success' : 'error' });
  };

  // ── Delete Handler ────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteModal.docId) return;
    setIsDeleting(true);
    try {
      await handleDelete(deleteModal.docId);
      setDeleteModal({ isOpen: false, docId: null });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Research Complete Handler ─────────────────────────
  const handleResearchComplete = async (savedDocs?: any[], shouldSync?: boolean) => {
    setIsResearchModalOpen(false);
    if (shouldSync && savedDocs && savedDocs.length > 0) {
      const docIds = savedDocs.map((d) => d.id);
      await hookResearchComplete(docIds);
    } else {
      await fetchDocuments();
    }
  };

  // ── Status Config Helper ──────────────────────────────
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
      case "ERROR": return { icon: <XCircle className="w-3 h-3" />, text: "Error", className: "text-ink" };
      case "PENDING": return { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Processing", className: "text-ink-muted" };
      default: return { icon: <Sparkles className="w-3 h-3" />, text: status, className: "text-ink-muted" };
    }
  };

  // ── Tab & Filter Config ───────────────────────────────
  const viewTabs = [
    { id: "all" as ViewMode, label: "All", count: counts.all },
    { id: "academic" as ViewMode, label: "Papers", icon: BookOpen, count: counts.academic },
    { id: "web" as ViewMode, label: "Web", icon: Globe, count: counts.web },
    { id: "uploaded" as ViewMode, label: "Uploaded", icon: Upload, count: counts.uploaded },
  ];

  const accessFilters = [
    { id: "all" as AccessFilter, label: "All", count: counts.academic, icon: Filter },
    { id: "open" as AccessFilter, label: "Free PDF", count: counts.open, icon: Unlock },
    { id: "paywalled" as AccessFilter, label: "Paywalled", count: counts.paywalled, icon: Lock },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
          <FileText className="w-4 h-4 text-rust" />
          Research Library
          {counts.all > 0 && (
            <span className="text-xs bg-selection text-ink px-2 py-0.5 rounded-full">
              {counts.all}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Deep Research Button */}
          <button
            onClick={() => setIsResearchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 min-h-11 rounded-md bg-selection hover:bg-paper text-ink text-xs font-medium transition-colors border border-rule"
          >
            <Zap className="w-3.5 h-3.5" />
            Deep Research
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "min-w-11 min-h-11 flex items-center justify-center rounded-md transition-colors",
              isExpanded
                ? "bg-selection text-rust rotate-45"
                : "bg-selection text-ink-muted hover:bg-selection hover:text-ink"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Processing Banner */}
      <AnimatePresence>
        {(isProcessingBatch || Object.values(extractingDocs).some(Boolean)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-selection border border-rule rounded-md"
          >
            <div className="px-4 py-2.5 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-rust animate-spin shrink-0" />
              <span className="text-xs font-medium text-ink">
                AI is processing documents. Please do not close the page.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Upload Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-writing border border-rule rounded-md p-4 space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 p-0.5 bg-paper rounded-lg w-fit">
                <button
                  onClick={() => setMode("upload")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === "upload" ? "bg-selection text-ink" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <Upload className="w-3 h-3 inline mr-1.5" />
                  Upload
                </button>
                <button
                  onClick={() => setMode("link")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === "link" ? "bg-selection text-ink" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <LinkIcon className="w-3 h-3 inline mr-1.5" />
                  Link
                </button>
              </div>

              {/* Input */}
              {mode === "upload" ? (
                <div>
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    accept=".pdf,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="doc-upload"
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 px-4 rounded-lg cursor-pointer transition-all border border-dashed",
                      file ? "border-rust bg-purple-500/5" : "border-rule hover:border-rule bg-writing"
                    )}
                  >
                    {file ? (
                      <span className="text-sm text-ink font-medium truncate">{file.name}</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-ink-muted" />
                        <span className="text-sm text-ink-muted">Drop PDF or DOCX here</span>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://arxiv.org/pdf/..."
                  className="w-full bg-writing border border-rule rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-rust transition-colors"
                />
              )}

              {/* Submit */}
              <button
                onClick={handleUpload}
                disabled={(!file && !link) || isUploading}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  (!file && !link) || isUploading
                    ? "bg-selection text-ink-muted cursor-not-allowed"
                    : "bg-rust hover:bg-rust/90 text-writing"
                )}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    {mode === "upload" ? "Upload & Process" : "Add Link"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Tabs */}
      {counts.all > 0 && (
        <div className="flex gap-1 p-1 bg-writing rounded-lg overflow-x-auto">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                viewMode === tab.id
                  ? "bg-selection text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-selection"
              )}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                viewMode === tab.id ? "bg-selection text-ink" : "bg-selection text-ink-muted"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Access Filter (only show on papers tab) */}
      {
        viewMode === 'academic' && counts.academic > 0 && (
          <div className="flex items-center gap-1 p-1 bg-writing rounded-lg mb-4 border border-rule w-fit">
            {accessFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAccessFilter(filter.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  accessFilter === filter.id
                    ? 'bg-selection text-ink'
                    : 'text-ink-muted hover:text-ink hover:bg-selection'
                )}
              >
                <filter.icon className="w-3 h-3" />
                {filter.label}
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs',
                  accessFilter === filter.id
                    ? filter.id === 'open'
                      ? 'bg-green-500/20 text-ink'
                      : filter.id === 'paywalled'
                        ? 'bg-orange-500/20 text-ink'
                        : 'bg-selection text-ink'
                    : 'bg-selection text-ink-muted'
                )}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        )
      }

      {/* Document List */}
      <AnimatePresence mode="wait">
        {filteredDocs.length > 0 ? (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                getStatusConfig={getStatusConfig}
                onView={() => setSelectedDocument(doc)}
                onDelete={() => setDeleteModal({ isOpen: true, docId: doc.id })}
                onRetry={() => handleExtract(doc.id)}
                onManualFetch={() => handleManualFetch(doc.id)}
                isExtracting={!!extractingDocs[doc.id]}
              />
            ))}
          </motion.div>
        ) : counts.all === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-selection flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-rust/50" />
            </div>
            <p className="text-sm text-ink-muted mb-1">No research documents yet</p>
            <p className="text-xs text-ink-muted mb-3">Run Deep Research or upload your own sources</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-selection text-ink text-xs font-medium hover:bg-selection transition-colors"
              >
                <Zap className="w-3 h-3" />
                Start Research
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-selection text-ink text-xs font-medium hover:bg-selection transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 text-center"
          >
            <p className="text-xs text-ink-muted">No documents in this category</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {
        counts.all > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-rule">
            <p className="text-xs text-ink-muted">Documents provide AI context for generation</p>
            <button
              onClick={handleRetrySync}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
              title="Sync to AI knowledge base"
            >
              <RefreshCw className="w-3 h-3" />
              Sync AI
            </button>
          </div>
        )
      }

      {/* Modals */}
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

      <ConfirmModal
        isOpen={syncModal.isOpen && !!syncModal.result}
        onClose={() => setSyncModal({ isOpen: false })}
        onConfirm={() => setSyncModal({ isOpen: false })}
        title={syncModal.result === 'success' ? 'Sync Complete' : 'Sync Failed'}
        message={syncModal.result === 'success'
          ? 'All documents have been synced to the AI knowledge base.'
          : 'Failed to sync documents. Please try again.'}
        confirmText="OK"
        cancelText=""
        type={syncModal.result === 'success' ? 'success' : 'danger'}
      />

      <ResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        projectId={projectId}
        projectTopic={useBuilderStore.getState().data.topic}
        onComplete={handleResearchComplete}
      />
    </div>
  );
}

// ── Inline DocumentCard (workspace-specific styling) ───────
function DocumentCard({
  doc,
  getStatusConfig,
  onView,
  onDelete,
  onRetry,
  onManualFetch,
  isExtracting
}: {
  doc: any;
  getStatusConfig: (status: string, imported: boolean, error: boolean) => { icon: React.ReactNode; text: string; className: string };
  onView: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onManualFetch?: () => void;
  isExtracting: boolean;
}) {
  const status = getStatusConfig(doc.status, doc.importedToFileSearch, !!doc.importError);
  const isAcademic = doc.sourceType === 'ACADEMIC';
  const isWeb = doc.sourceType === 'WEB';
  const hasOpenAccess = doc.openAccessUrl && doc.openAccessUrl.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-writing hover:bg-selection border border-rule hover:border-rule rounded-md p-3 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
          isAcademic ? "bg-blue-500/10" : isWeb ? "bg-orange-500/10" : "bg-selection"
        )}>
          {isAcademic ? (
            <BookOpen className="w-4 h-4 text-blue-400" />
          ) : isWeb ? (
            <Globe className="w-4 h-4 text-orange-400" />
          ) : (
            <FileText className="w-4 h-4 text-rust" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={doc.fileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-ink hover:text-ink line-clamp-1 transition-colors"
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
                Academic
              </span>
            )}
            {isWeb && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-ink rounded text-xs">
                <Globe className="w-2.5 h-2.5" />
                Web
              </span>
            )}

            {/* Citation Count */}
            {isAcademic && doc.citationCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-selection text-ink rounded text-xs">
                <Quote className="w-2.5 h-2.5" />
                {doc.citationCount.toLocaleString()}
              </span>
            )}

            {/* Year */}
            {doc.year && (
              <span className="text-xs text-ink-muted">{doc.year}</span>
            )}

            {/* Status */}
            <span className={cn("flex items-center gap-1 text-xs", status.className)}>
              {status.icon}
              {status.text}
            </span>
          </div>

          {/* Snippet (for web sources) */}
          {isWeb && doc.snippet && (
            <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">
              {doc.snippet}
            </p>
          )}

          {/* Abstract Preview (for academic) */}
          {isAcademic && doc.abstractText && (
            <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">
              {doc.abstractText}
            </p>
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

        {/* Paywalled */}
        {isAcademic && !hasOpenAccess && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/10 text-ink-muted text-xs">
            <Lock className="w-3 h-3" />
            Paywalled
          </span>
        )}

        {/* View */}
        {doc.status === "PROCESSED" && (
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
            Open
          </a>
        )}

        {/* Retry */}
        {(doc.status === 'FAILED' || doc.status === 'EXTRACTION_FAILED') && (
          <button
            onClick={onRetry}
            disabled={isExtracting}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-ink text-xs transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", isExtracting && "animate-spin")} />
            Retry
          </button>
        )}

        {/* Manual Fetch PDF */}
        {onManualFetch && hasOpenAccess && doc.status !== 'PENDING' && doc.status !== 'PROCESSING' && (
          <button
            onClick={onManualFetch}
            disabled={isExtracting}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-selection hover:bg-selection text-ink text-xs font-medium transition-colors ml-1"
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
