"use client";

import { useState, useEffect } from "react";
import { Upload, Link as LinkIcon, FileText, Loader2, Trash2, CheckCircle, XCircle, Eye, Sparkles, BrainCircuit, RefreshCw, Plus } from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResearchDocument } from "@prisma/client";
import { cn } from "@/lib/utils";

export function DocumentUpload({ projectId, searchQuery = "" }: { projectId: string, searchQuery?: string }) {
    const [mode, setMode] = useState<"upload" | "link">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [extractionStatus, setExtractionStatus] = useState<Record<string, string>>({});
    const [syncingDocs, setSyncingDocs] = useState<Record<string, boolean>>({});
    const [selectedDocument, setSelectedDocument] = useState<ResearchDocument | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Modal states
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });
    const [syncModal, setSyncModal] = useState<{ isOpen: boolean; result?: 'success' | 'error' }>({ isOpen: false });
    const [isDeleting, setIsDeleting] = useState(false);

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
        setExtractionStatus(prev => ({ ...prev, [documentId]: "PROCESSING" }));

        try {
            const res = await fetch(`/api/documents/${documentId}/extract`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Extraction failed");

            const data = await res.json();

            setDocuments(prev => prev.map(doc =>
                doc.id === documentId
                    ? { ...doc, status: "PROCESSED", ...data.extraction.metadata }
                    : doc
            ));

            setExtractionStatus(prev => ({ ...prev, [documentId]: "SUCCESS" }));

        } catch (error) {
            console.error("Extraction error:", error);
            setExtractionStatus(prev => ({ ...prev, [documentId]: "FAILED" }));
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
            console.error(e);
            setSyncModal({ isOpen: true, result: 'error' });
        } finally {
            setSyncingDocs(prev => ({ ...prev, global: false }));
        }
    };

    const handleDeleteClick = (docId: string) => {
        setDeleteModal({ isOpen: true, docId });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.docId) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/documents/${deleteModal.docId}`, { method: 'DELETE' });
            if (res.ok) {
                setDocuments(prev => prev.filter(doc => doc.id !== deleteModal.docId));
                setDeleteModal({ isOpen: false, docId: null });
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusConfig = (status: string, importedToFileSearch: boolean, importError: boolean) => {
        if (status === "PROCESSED" && importedToFileSearch) {
            return { icon: <BrainCircuit className="w-3.5 h-3.5" />, text: "AI Ready", className: "text-emerald-400" };
        }
        if (importError) {
            return { icon: <XCircle className="w-3.5 h-3.5" />, text: "Sync Failed", className: "text-red-400" };
        }
        switch (status) {
            case "PROCESSED": return { icon: <CheckCircle className="w-3.5 h-3.5" />, text: "Ready", className: "text-green-400" };
            case "COMPLETED": return { icon: <CheckCircle className="w-3.5 h-3.5" />, text: "Ready", className: "text-green-400" };
            case "FAILED": return { icon: <XCircle className="w-3.5 h-3.5" />, text: "Failed", className: "text-red-400" };
            case "EXTRACTION_FAILED": return { icon: <XCircle className="w-3.5 h-3.5" />, text: "Failed", className: "text-orange-400" };
            case "PROCESSING": return { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: "Processing", className: "text-yellow-400" };
            case "PENDING": return { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: "Extracting", className: "text-blue-400" };
            default: return { icon: <Sparkles className="w-3.5 h-3.5" />, text: "Waiting", className: "text-gray-500" };
        }
    };

    const filteredDocs = documents.filter(doc =>
        !searchQuery ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.title && doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-3">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Research Documents
                    {documents.length > 0 && (
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-medium text-gray-400">
                            {documents.length}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "p-1.5 rounded-lg transition-all duration-200",
                        isExpanded
                            ? "bg-primary/20 text-primary rotate-45"
                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Collapsible Upload Section */}
            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                    {/* Minimal Tabs */}
                    <div className="flex gap-1 p-0.5 bg-black/30 rounded-lg w-fit">
                        <button
                            onClick={() => setMode("upload")}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                mode === "upload"
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Upload className="w-3 h-3 inline mr-1.5" />
                            Upload
                        </button>
                        <button
                            onClick={() => setMode("link")}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                mode === "link"
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <LinkIcon className="w-3 h-3 inline mr-1.5" />
                            Link
                        </button>
                    </div>

                    {/* Compact Input */}
                    {mode === "upload" ? (
                        <div className="relative">
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
                                    "flex items-center justify-center gap-2 py-4 px-4 rounded-lg cursor-pointer transition-all",
                                    "border border-dashed",
                                    file
                                        ? "border-primary/50 bg-primary/5"
                                        : "border-white/10 hover:border-white/20 bg-black/20"
                                )}
                            >
                                {file ? (
                                    <span className="text-sm text-primary font-medium truncate max-w-full">{file.name}</span>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-400">Drop PDF or DOCX here</span>
                                    </>
                                )}
                            </label>
                            {!file && (
                                <p className="text-[10px] text-gray-600 mt-1.5 text-center">
                                    Max 5MB • <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener" className="text-primary/70 hover:text-primary">Compress large files</a>
                                </p>
                            )}
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://arxiv.org/pdf/..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleUpload}
                        disabled={(!file && !link) || isUploading}
                        className={cn(
                            "w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                            (!file && !link) || isUploading
                                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white"
                        )}
                    >
                        {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                {mode === "upload" ? "Upload & Process" : "Add Link"}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Document List - Compact Cards */}
            {filteredDocs.length > 0 ? (
                <div className="space-y-1.5">
                    {filteredDocs.map((doc) => {
                        const status = getStatusConfig(doc.status, doc.importedToFileSearch, doc.importError);
                        const isProcessed = doc.status === "PROCESSED";
                        const isFailed = doc.status === "FAILED" || doc.status === "EXTRACTION_FAILED";
                        const isPending = doc.status === "PENDING" || doc.status === "PROCESSING";

                        return (
                            <div
                                key={doc.id}
                                className={cn(
                                    "group relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200",
                                    "bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5",
                                    isProcessed && "cursor-pointer"
                                )}
                                onClick={() => isProcessed && setSelectedDocument(doc)}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                    doc.fileType === 'file' ? "bg-blue-500/10" : "bg-purple-500/10"
                                )}>
                                    {doc.fileType === 'file' ? (
                                        <FileText className="w-4 h-4 text-blue-400" />
                                    ) : (
                                        <LinkIcon className="w-4 h-4 text-purple-400" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-200 truncate leading-tight" title={doc.fileName}>
                                        {doc.fileName}
                                    </p>
                                    <div className={cn("flex items-center gap-1.5 mt-0.5", status.className)}>
                                        {status.icon}
                                        <span className="text-[11px] font-medium">{status.text}</span>
                                    </div>
                                </div>

                                {/* Actions - Hover Reveal */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isProcessed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedDocument(doc); }}
                                            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                            title="View document"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {isFailed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleExtract(doc.id); }}
                                            disabled={isExtracting}
                                            className="p-1.5 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                                            title="Retry processing"
                                        >
                                            <RefreshCw className={cn("w-3.5 h-3.5", isExtracting && "animate-spin")} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(doc.id); }}
                                        className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : documents.length === 0 ? (
                <div className="py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-500">No documents yet</p>
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="text-xs text-primary/70 hover:text-primary mt-1 transition-colors"
                    >
                        Add your first document
                    </button>
                </div>
            ) : (
                <p className="text-xs text-gray-500 text-center py-4">No documents match your search</p>
            )}

            {/* Footer - Only show if has documents */}
            {documents.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <p className="text-[10px] text-gray-600">
                        Documents are used as AI context
                    </p>
                    <button
                        onClick={handleRetrySync}
                        disabled={syncingDocs['global']}
                        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                        title="Force sync to AI"
                    >
                        <RefreshCw className={cn("w-3 h-3", syncingDocs['global'] && "animate-spin")} />
                        Sync
                    </button>
                </div>
            )}

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
                message="This will permanently remove the document from your research library. This action cannot be undone."
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
                    : 'Failed to sync documents. Please try again later.'}
                confirmText="OK"
                cancelText=""
                type={syncModal.result === 'success' ? 'success' : 'danger'}
            />
        </div>
    );
}
