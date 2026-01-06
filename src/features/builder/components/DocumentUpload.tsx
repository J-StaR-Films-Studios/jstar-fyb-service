"use client";

import { useState, useEffect } from "react";
import { Upload, Link as LinkIcon, FileText, Loader2, Trash2, CheckCircle, XCircle, Eye, Sparkles, BrainCircuit, RefreshCw } from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResearchDocument } from "@prisma/client";

export function DocumentUpload({ projectId, searchQuery = "" }: { projectId: string, searchQuery?: string }) {
    const [mode, setMode] = useState<"upload" | "link">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [extractionStatus, setExtractionStatus] = useState<Record<string, string>>({});
    const [syncingDocs, setSyncingDocs] = useState<Record<string, boolean>>({}); // Track manual syncs
    const [selectedDocument, setSelectedDocument] = useState<ResearchDocument | null>(null);

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

        // Client-side validation for file uploads
        if (mode === "upload" && file) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - matches server limit
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

            // Add to list
            setDocuments(prev => [...prev, {
                id: data.doc.id,
                fileName: mode === "upload" ? file!.name : "External Link",
                fileType: mode === "upload" ? "file" : "link",
                status: "PENDING",
                ...data.doc
            }]);

            // Reset
            setFile(null);
            setLink("");

            // Auto-start extraction for file uploads
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

            if (!res.ok) {
                throw new Error("Extraction failed");
            }

            const data = await res.json();

            // Update document status
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PROCESSED": return <CheckCircle className="w-4 h-4 text-green-400" />;
            case "COMPLETED": return <CheckCircle className="w-4 h-4 text-green-400" />;
            case "FAILED": return <XCircle className="w-4 h-4 text-red-400" />;
            case "EXTRACTION_FAILED": return <XCircle className="w-4 h-4 text-orange-400" />;
            case "PROCESSING": return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
            case "PENDING": return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
            default: return <Sparkles className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "PROCESSED": return "AI Summary Ready";
            case "COMPLETED": return "Ready";
            case "FAILED": return "Processing Failed";
            case "EXTRACTION_FAILED": return "Text Extraction Failed";
            case "PROCESSING": return "Generating Summary...";
            case "PENDING": return "Extracting Text...";
            default: return "Waiting...";
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Research Documents
            </h3>

            {/* Tabs */}
            <div className="flex bg-black/20 p-1 rounded-lg mb-4 w-fit">
                <button
                    onClick={() => setMode("upload")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "upload" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                        }`}
                >
                    Upload PDF
                </button>
                <button
                    onClick={() => setMode("link")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "link" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                        }`}
                >
                    Paste Link
                </button>
            </div>

            {/* Input Area */}
            <div className="mb-6">
                {mode === "upload" ? (
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                        <input
                            type="file"
                            id="doc-upload"
                            className="hidden"
                            accept=".pdf,.docx"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <label htmlFor="doc-upload" className="cursor-pointer block">
                            {file ? (
                                <div className="text-primary font-bold">{file.name}</div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Click to upload PDF or DOCX</p>
                                    <p className="text-gray-600 text-xs mt-1">Max 5MB • <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener" className="text-primary hover:underline">Compress PDFs here</a></p>
                                </>
                            )}
                        </label>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://arxiv.org/pdf/..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary"
                        />
                        <p className="text-xs text-gray-500">Paste a direct link to a research paper or resource.</p>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={(!file && !link) || isUploading}
                    className="mt-4 w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        mode === "upload" ? "Upload & Process" : "Add Link"
                    )}
                </button>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                        {searchQuery ? `Search Results (${documents.filter(d =>
                            d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.title?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length})` : "Uploaded Documents"}
                    </h4>
                    {documents
                        .filter(doc =>
                            !searchQuery ||
                            doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (doc.title && doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((doc) => (
                            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-0.5 shrink-0">
                                        {doc.fileType === 'file' ? (
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        ) : (
                                            <LinkIcon className="w-5 h-5 text-purple-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium text-white block truncate" title={doc.fileName}>
                                            {doc.fileName}
                                        </span>
                                        {doc.title && (
                                            <p className="text-xs text-gray-400 truncate mt-0.5" title={doc.title}>
                                                {doc.title}
                                            </p>
                                        )}
                                    </div>
                                    {/* AI Sync Badge */}
                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 ml-2">
                                        {doc.importedToFileSearch ? (
                                            <>
                                                <BrainCircuit className="w-3 h-3 text-purple-400" />
                                                <span className="text-[10px] text-gray-300 font-medium tracking-wide">AI READY</span>
                                            </>
                                        ) : doc.importError ? (
                                            <>
                                                <XCircle className="w-3 h-3 text-red-500" />
                                                <span className="text-[10px] text-red-400">SYNC FAILED</span>
                                            </>
                                        ) : doc.fileType !== 'link' ? (
                                            <>
                                                <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
                                                <span className="text-[10px] text-gray-500">SYNCING...</span>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t border-white/5 sm:border-0">
                                    {/* Status */}
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(doc.status)}
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{getStatusText(doc.status)}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {doc.status === "PENDING" && (
                                            <button
                                                onClick={() => handleExtract(doc.id)}
                                                disabled={isExtracting}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md text-xs transition-colors border border-blue-500/20"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                Process
                                            </button>
                                        )}

                                        {doc.status === "PROCESSED" && (
                                            <button
                                                onClick={() => setSelectedDocument(doc)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-md text-xs transition-colors border border-green-500/20"
                                            >
                                                <Eye className="w-3 h-3" />
                                                View
                                            </button>
                                        )}

                                        {/* Retry Extraction for failed docs */}
                                        {(doc.status === "EXTRACTION_FAILED" || doc.status === "FAILED") && (
                                            <button
                                                onClick={() => handleExtract(doc.id)}
                                                disabled={isExtracting}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-md text-xs transition-colors border border-orange-500/20"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${isExtracting ? 'animate-spin' : ''}`} />
                                                Retry
                                            </button>
                                        )}


                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteClick(doc.id)}
                                            className="flex items-center gap-1.5 px-2 py-1.5 text-red-400 hover:bg-red-500/10 rounded-md text-xs transition-colors"
                                            title="Delete document"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )
            }

            {/* Processing Info */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
                <div className="text-xs text-gray-500">
                    <p><strong>Note:</strong> Processed documents become available as context for chapter generation and research assistance.</p>
                </div>

                {/* Manual Sync Retry */}
                <button
                    onClick={handleRetrySync}
                    disabled={syncingDocs['global']}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Force sync documents to AI search index"
                >
                    <RefreshCw className={`w-3 h-3 ${syncingDocs['global'] ? "animate-spin" : ""}`} />
                    Retry AI Sync
                </button>
            </div>

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                researchDoc={selectedDocument}
                isOpen={!!selectedDocument}
                onClose={() => setSelectedDocument(null)}
            />

            {/* Delete Confirmation Modal */}
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

            {/* Sync Status Modal */}
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
        </div >
    );
}
