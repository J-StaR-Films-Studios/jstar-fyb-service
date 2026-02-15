"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Link as LinkIcon, FileText, Loader2, Trash2, CheckCircle,
  XCircle, Eye, Sparkles, BrainCircuit, RefreshCw, Plus, BookOpen,
  Globe, Quote, Download, Lock, Unlock, ExternalLink, Search, Zap, ArrowRight, Filter
} from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResearchDocument } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ResearchModal } from "@/features/research/components/ResearchModal";

type ViewMode = "all" | "academic" | "web" | "uploaded";
type AccessFilter = "all" | "open" | "paywalled";

export function DocumentUpload({ projectId, searchQuery = "" }: { projectId: string, searchQuery?: string }) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ResearchDocument | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean; result?: 'success' | 'error' }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncingDocs, setSyncingDocs] = useState<Record<string, boolean>>({});

  // Fetch existing documents
  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/documents?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  // Categorize documents
  const { academicPapers, webSources, uploadedDocs, counts } = useMemo(() => {
    const academic: any[] = [];
    const web: any[] = [];
    const uploaded: any[] = [];

    let openCount = 0;
    let paywalledCount = 0;

    for (const doc of documents) {
      if (doc.sourceType === 'ACADEMIC') {
        academic.push(doc);
        if (doc.openAccessUrl && doc.openAccessUrl.length > 0) {
          openCount++;
        } else {
          paywalledCount++;
        }
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
        academic: academic.length,
        web: web.length,
        uploaded: uploaded.length,
        open: openCount,
        paywalled: paywalledCount
      }
    };
  }, [documents]);

  // Get filtered documents based on view mode
  const filteredDocs = useMemo(() => {
    let docs: any[] = [];
    switch (viewMode) {

      case "academic":
        docs = academicPapers;
        if (accessFilter !== 'all') {
          docs = docs.filter(doc => {
            const hasOpen = doc.openAccessUrl && doc.openAccessUrl.length > 0;
            return accessFilter === 'open' ? hasOpen : !hasOpen;
          });
        }
        break;
      case "web": docs = webSources; break;
      case "uploaded": docs = uploadedDocs; break;
      default: docs = documents;
    }

    if (!searchQuery) return docs;
    return docs.filter(doc =>
      doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [viewMode, academicPapers, webSources, uploadedDocs, documents, searchQuery, accessFilter]);

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
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      setDocuments(prev => [...prev, {
        id: data.doc.id,
        fileName: mode === "upload" ? file!.name : "External Link",
        fileType: mode === "upload" ? "file" : "link",
        status: "PENDING",
        ...data.doc
      }]);

      setFile(null);
      setLink("");
      setIsExpanded(false);

      if (mode === "upload" && data.doc.id) {
        await handleExtract(data.doc.id);
      }

    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = async (documentId: string) => {
    setIsExtracting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/extract`, { method: "POST" });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, status: "PROCESSED", ...data.extraction.metadata } : doc
      ));
    } catch (error) {
      console.error("Extraction error:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetrySync = async () => {
    setSyncModal({ isOpen: true });
    setSyncingDocs(prev => ({ ...prev, global: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/research/sync`, { method: 'POST' });
      if (res.ok) {
        await fetchDocuments();
        setSyncModal({ isOpen: true, result: 'success' });
      } else {
        setSyncModal({ isOpen: true, result: 'error' });
      }
    } catch (e) {
      setSyncModal({ isOpen: true, result: 'error' });
    } finally {
      setSyncingDocs(prev => ({ ...prev, global: false }));
    }
  };

  const handleDeleteClick = (docId: string) => setDeleteModal({ isOpen: true, docId });

  const handleDeleteConfirm = async () => {
    if (!deleteModal.docId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteModal.docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== deleteModal.docId));
        setDeleteModal({ isOpen: false, docId: null });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusConfig = (status: string, importedToFileSearch: boolean, importError: boolean) => {
    if (status === "PROCESSED" && importedToFileSearch) {
      return { icon: <BrainCircuit className="w-3 h-3" />, text: "AI Ready", className: "text-emerald-400" };
    }
    if (importError) {
      return { icon: <XCircle className="w-3 h-3" />, text: "Sync Failed", className: "text-red-400" };
    }
    switch (status) {
      case "PROCESSED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Ready", className: "text-green-400" };
      case "COMPLETED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Ready", className: "text-green-400" };
      case "INDEXED": return { icon: <CheckCircle className="w-3 h-3" />, text: "Indexed", className: "text-green-400" };
      case "FAILED": return { icon: <XCircle className="w-3 h-3" />, text: "Failed", className: "text-red-400" };
      case "ERROR": return { icon: <XCircle className="w-3 h-3" />, text: "Error", className: "text-rose-400" };
      case "PENDING": return { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Processing", className: "text-yellow-400" };
      default: return { icon: <Sparkles className="w-3 h-3" />, text: status, className: "text-gray-500" };
    }
  };

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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          Research Library
          {counts.all > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {counts.all}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Deep Research Button */}
          <button
            onClick={() => setIsResearchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-300 text-xs font-medium transition-all border border-purple-500/20"
          >
            <Zap className="w-3.5 h-3.5" />
            Deep Research
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200",
              isExpanded
                ? "bg-purple-500/20 text-purple-400 rotate-45"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Upload Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 p-0.5 bg-black/30 rounded-lg w-fit">
                <button
                  onClick={() => setMode("upload")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === "upload" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Upload className="w-3 h-3 inline mr-1.5" />
                  Upload
                </button>
                <button
                  onClick={() => setMode("link")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === "link" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
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
                      file ? "border-purple-500/50 bg-purple-500/5" : "border-white/10 hover:border-white/20 bg-black/20"
                    )}
                  >
                    {file ? (
                      <span className="text-sm text-purple-300 font-medium truncate">{file.name}</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-400">Drop PDF or DOCX here</span>
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
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              )}

              {/* Submit */}
              <button
                onClick={handleUpload}
                disabled={(!file && !link) || isUploading}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  (!file && !link) || isUploading
                    ? "bg-white/5 text-gray-500 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600 text-white"
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
        <div className="flex gap-1 p-1 bg-white/[0.02] rounded-lg overflow-x-auto">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                viewMode === tab.id
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                viewMode === tab.id ? "bg-purple-500/30 text-purple-200" : "bg-white/5 text-gray-500"
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
          <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg mb-4 border border-white/5 w-fit">
            {accessFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAccessFilter(filter.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  accessFilter === filter.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <filter.icon className="w-3 h-3" />
                {filter.label}
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  accessFilter === filter.id
                    ? filter.id === 'open'
                      ? 'bg-green-500/20 text-green-300'
                      : filter.id === 'paywalled'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-white/10 text-gray-300'
                    : 'bg-white/5 text-gray-500'
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
                onDelete={() => handleDeleteClick(doc.id)}
                onRetry={() => handleExtract(doc.id)}
                isExtracting={isExtracting}
              />
            ))}
          </motion.div>
        ) : counts.all === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-purple-400/50" />
            </div>
            <p className="text-sm text-gray-400 mb-1">No research documents yet</p>
            <p className="text-xs text-gray-500 mb-3">Run Deep Research or upload your own sources</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Start Research
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors"
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
            <p className="text-xs text-gray-500">No documents in this category</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {
        counts.all > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <p className="text-[10px] text-gray-600">Documents provide AI context for generation</p>
            <button
              onClick={handleRetrySync}
              disabled={syncingDocs['global']}
              className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Sync to AI knowledge base"
            >
              <RefreshCw className={cn("w-3 h-3", syncingDocs['global'] && "animate-spin")} />
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
        onComplete={() => fetchDocuments()}
      />
    </div>
  );
}

// Separate card component for cleaner code
function DocumentCard({
  doc,
  getStatusConfig,
  onView,
  onDelete,
  onRetry,
  isExtracting
}: {
  doc: any;
  getStatusConfig: (status: string, imported: boolean, error: boolean) => { icon: React.ReactNode; text: string; className: string };
  onView: () => void;
  onDelete: () => void;
  onRetry: () => void;
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
      className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-3 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
          isAcademic ? "bg-blue-500/10" : isWeb ? "bg-orange-500/10" : "bg-purple-500/10"
        )}>
          {isAcademic ? (
            <BookOpen className="w-4 h-4 text-blue-400" />
          ) : isWeb ? (
            <Globe className="w-4 h-4 text-orange-400" />
          ) : (
            <FileText className="w-4 h-4 text-purple-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={doc.fileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-purple-300 line-clamp-1 transition-colors"
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
                Academic
              </span>
            )}
            {isWeb && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-300 rounded text-[10px]">
                <Globe className="w-2.5 h-2.5" />
                Web
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
            {doc.year && (
              <span className="text-[10px] text-gray-500">{doc.year}</span>
            )}

            {/* Status */}
            <span className={cn("flex items-center gap-1 text-[10px]", status.className)}>
              {status.icon}
              {status.text}
            </span>
          </div>

          {/* Snippet (for web sources) */}
          {isWeb && doc.snippet && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
              {doc.snippet}
            </p>
          )}

          {/* Abstract Preview (for academic) */}
          {isAcademic && doc.abstractText && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
              {doc.abstractText}
            </p>
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

        {/* Paywalled */}
        {isAcademic && !hasOpenAccess && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/10 text-gray-400 text-[10px]">
            <Lock className="w-3 h-3" />
            Paywalled
          </span>
        )}

        {/* View */}
        {doc.status === "PROCESSED" && (
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
            Open
          </a>
        )}

        {/* Retry */}
        {(doc.status === 'FAILED' || doc.status === 'EXTRACTION_FAILED') && (
          <button
            onClick={onRetry}
            disabled={isExtracting}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-[10px] transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", isExtracting && "animate-spin")} />
            Retry
          </button>
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
