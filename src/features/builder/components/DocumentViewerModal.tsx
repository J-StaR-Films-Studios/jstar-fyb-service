"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
    X,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    DownloadCloud,
    Search,
    BookOpen,
    User,
    Calendar,
    Sparkles,
    Loader2,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { ResearchDocument } from "@prisma/client";

// Dynamically import react-pdf components with SSR disabled
const Document = dynamic(
    () => import("react-pdf").then((mod) => mod.Document),
    { ssr: false }
);

const Page = dynamic(
    () => import("react-pdf").then((mod) => mod.Page),
    { ssr: false }
);

interface DocumentViewerModalProps {
    researchDoc: ResearchDocument | null;
    isOpen: boolean;
    onClose: () => void;
}

export const DocumentViewerModal = ({
    researchDoc,
    isOpen,
    onClose,
}: DocumentViewerModalProps) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [zoom, setZoom] = useState<number>(100);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [pdfWorkerReady, setPdfWorkerReady] = useState<boolean>(false);

    // Configure PDF.js worker on client side only
    // Using CDN is the most reliable approach with Turbopack and react-pdf@10.x
    useEffect(() => {
        const setupWorker = async () => {
            try {
                const { pdfjs } = await import("react-pdf");
                // Use CDN worker - most reliable with Next.js Turbopack
                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
                setPdfWorkerReady(true);
            } catch (error) {
                console.error("Failed to setup PDF worker:", error);
                setLoadError("Failed to initialize PDF viewer");
            }
        };
        setupWorker();
    }, []);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Auto-hide sidebar on mobile
    useEffect(() => {
        if (isMobile) setShowSidebar(false);
    }, [isMobile]);

    // Load PDF URL when modal opens
    useEffect(() => {
        if (isOpen && researchDoc?.id) {
            setIsLoading(true);
            setLoadError(null);
            setPdfUrl(`/api/documents/${researchDoc.id}/serve`);
        } else {
            setPdfUrl(null);
            setCurrentPage(1);
            setZoom(100);
        }
    }, [isOpen, researchDoc?.id]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "ArrowLeft":
                    setCurrentPage((p) => Math.max(1, p - 1));
                    break;
                case "ArrowRight":
                    setCurrentPage((p) => Math.min(numPages, p + 1));
                    break;
                case "+":
                case "=":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setZoom((z) => Math.min(200, z + 25));
                    }
                    break;
                case "-":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setZoom((z) => Math.max(50, z - 25));
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, numPages, onClose]);

    const onDocumentLoadSuccess = useCallback(
        ({ numPages }: { numPages: number }) => {
            setNumPages(numPages);
            setIsLoading(false);
        },
        []
    );

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error("PDF load error:", error);
        setLoadError("Failed to load PDF. The file may be corrupted or unavailable.");
        setIsLoading(false);
    }, []);

    const handleZoomIn = () => setZoom((z) => Math.min(200, z + 25));
    const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
    const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
    const handleNextPage = () => setCurrentPage((p) => Math.min(numPages, p + 1));

    // Parse keywords and insights from JSON strings
    const parseJsonArray = (jsonString: string | null): string[] => {
        if (!jsonString) return [];
        try {
            const parsed = JSON.parse(jsonString);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    if (!isOpen || !researchDoc) return null;

    const keywords = parseJsonArray(researchDoc.keywords);
    const insights = parseJsonArray(researchDoc.insights);

    return createPortal(
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Container */}
            <div className="w-full h-full md:h-[95vh] md:w-[95vw] md:max-w-7xl flex flex-col rounded-none md:rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 border-0 md:border border-white/10 overflow-hidden bg-[#030014]">
                {/* Header */}
                <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                            PDF
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm md:text-base font-bold text-white truncate">
                                {researchDoc.title || researchDoc.fileName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{researchDoc.author || "Unknown Author"}</span>
                                {researchDoc.year && (
                                    <>
                                        <span>•</span>
                                        <span>{researchDoc.year}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        {/* Search - Hidden on mobile */}
                        <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                            <Search className="w-4 h-4 text-gray-500 mr-2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="bg-transparent text-sm text-white placeholder:text-gray-600 outline-none w-32"
                            />
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg">
                            <button
                                onClick={handleZoomOut}
                                disabled={zoom <= 50}
                                className="p-1.5 md:p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-l-lg"
                                title="Zoom out"
                            >
                                <ZoomOut className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="text-xs font-medium text-gray-400 w-10 md:w-12 text-center">
                                {zoom}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                disabled={zoom >= 200}
                                className="p-1.5 md:p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-r-lg"
                                title="Zoom in"
                            >
                                <ZoomIn className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                className="p-1.5 md:p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-l-lg"
                                title="Previous page"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="text-xs font-medium text-gray-400 w-14 md:w-16 text-center">
                                {currentPage}/{numPages || "..."}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="p-1.5 md:p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-r-lg"
                                title="Next page"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                            title={showSidebar ? "Hide details" : "Show details"}
                        >
                            {showSidebar ? (
                                <Minimize2 className="w-4 h-4 text-gray-400" />
                            ) : (
                                <Maximize2 className="w-4 h-4 text-gray-400" />
                            )}
                        </button>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-auto bg-[#1a1a2e] flex items-start justify-center p-4 md:p-6">
                        {(isLoading || !pdfWorkerReady) && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm">Loading document...</span>
                            </div>
                        )}

                        {loadError && (
                            <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                                <FileText className="w-12 h-12 mb-3 opacity-50" />
                                <span className="text-sm">{loadError}</span>
                            </div>
                        )}

                        {pdfUrl && pdfWorkerReady && !loadError && (
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={null}
                                className="flex flex-col items-center gap-4"
                            >
                                <Page
                                    pageNumber={currentPage}
                                    scale={zoom / 100}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="shadow-2xl rounded-sm"
                                    loading={
                                        <div className="bg-white w-[595px] h-[842px] flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                        </div>
                                    }
                                />
                            </Document>
                        )}
                    </div>

                    {/* Sidebar - Metadata & Insights */}
                    {showSidebar && (
                        <div className="w-full md:w-80 border-l border-white/10 bg-black/30 overflow-y-auto shrink-0 absolute md:relative inset-0 md:inset-auto z-10 md:z-0">
                            {/* Mobile close button for sidebar */}
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10">
                                <span className="font-bold text-white">Document Details</span>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="p-4 md:p-5 space-y-5">
                                {/* Summary / Structured Analysis */}
                                {(() => {
                                    let content = null;
                                    let isJson = false;
                                    try {
                                        if (researchDoc.summary) {
                                            const cleanStr = researchDoc.summary.replace(/```json/g, '').replace(/```/g, '').trim();
                                            if (cleanStr.startsWith('{')) {
                                                const parsed = JSON.parse(cleanStr);
                                                isJson = true;
                                                content = parsed;
                                            }
                                        }
                                    } catch (e) {
                                        // Not JSON, treat as plain text
                                    }

                                    if (isJson && content) {
                                        return (
                                            <div className="space-y-4">
                                                {content.objective && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                            Objective
                                                        </div>
                                                        <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
                                                            <p className="text-gray-300 text-sm leading-relaxed">{content.objective}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {content.motivation && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Motivation</div>
                                                        <p className="text-gray-400 text-sm">{content.motivation}</p>
                                                    </div>
                                                )}

                                                {content.methodology && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Methodology</div>
                                                        <p className="text-gray-400 text-sm">{content.methodology}</p>
                                                    </div>
                                                )}

                                                {content.contribution && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contribution</div>
                                                        <p className="text-gray-400 text-sm">{content.contribution}</p>
                                                    </div>
                                                )}

                                                {content.limitations && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Limitations</div>
                                                        <p className="text-gray-400 text-sm">{content.limitations}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else if (researchDoc.summary) {
                                        return (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    Summary
                                                </div>
                                                <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                                    <p className="text-gray-300 text-sm leading-relaxed">
                                                        {researchDoc.summary}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                                            <User className="w-3 h-3" />
                                            Author
                                        </div>
                                        <span className="text-white text-sm font-medium line-clamp-1" title={researchDoc.author || "Unknown"}>
                                            {researchDoc.author || "N/A"}
                                        </span>
                                    </div>
                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                                            <Calendar className="w-3 h-3" />
                                            Year
                                        </div>
                                        <span className="text-white text-sm font-medium">
                                            {researchDoc.year || "N/A"}
                                        </span>
                                    </div>
                                </div>

                                {/* Document Type */}
                                {researchDoc.documentType && (
                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                                            <FileText className="w-3 h-3" />
                                            Document Type
                                        </div>
                                        <span className="text-white text-sm font-medium capitalize">
                                            {researchDoc.documentType}
                                        </span>
                                    </div>
                                )}

                                {/* AI Insights */}
                                {insights.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                            AI Insights
                                        </div>
                                        <div className="space-y-2">
                                            {insights.slice(0, 3).map((insight, i) => (
                                                <div
                                                    key={i}
                                                    className="bg-purple-500/5 rounded-xl p-3 border border-purple-500/10 text-sm text-gray-300"
                                                >
                                                    {insight}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Keywords */}
                                {keywords.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            Keywords
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {keywords.map((keyword, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Status */}
                                <div className="flex items-center gap-2 pt-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-[10px] font-bold border border-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        ANALYZED
                                    </div>
                                    <span className="text-[10px] text-gray-600">
                                        Context available for AI
                                    </span>
                                </div>
                            </div>

                            {/* Download Button */}
                            <div className="p-4 border-t border-white/10 mt-auto">
                                <a
                                    href={`/api/documents/${researchDoc.id}/serve`}
                                    download={researchDoc.fileName}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-sm transition-all"
                                >
                                    <DownloadCloud className="w-4 h-4 text-gray-400" />
                                    Download PDF
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
