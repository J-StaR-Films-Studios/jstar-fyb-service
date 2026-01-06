# Escalation Handoff Report

**Generated:** 2026-01-06
**Original Issue:** Implementing Search Highlighting in `react-pdf` Viewer

---

## PART 1: THE DAMAGE REPORT

### 1.1 Original Goal
The user requested a "Search" feature for the mobile/desktop PDF viewer (`DocumentViewerModal.tsx`). The requirements were:
1.  Search bar to input text.
2.  Navigation (< >) to jump between matches.
3.  **Visual Highlighting** of the matched terms on the PDF page.

### 1.2 Observed Failure / Error
The search logic works:
-   It correctly finds matches in the PDF text.
-   It navigates to the correct page and scrolls to the match.
-   The "Match X/Y" counter works.

**The Failure:** The **highlighting is invisible**. The user reports "nothing is highlighted so far" despite the viewer scrolling to the correct location.

### 1.3 Failed Approach
I attempted to use `react-pdf`'s `customTextRenderer` to wrap matched text in a styled element.
1.  **Attempt 1:** Used standard Tailwind classes (`bg-yellow-400/50`). Result: Invisible.
2.  **Attempt 2:** Used inline styles (`backgroundColor: '#facc15'`, `opacity: 0.4`). Result: Invisible.
3.  **Attempt 3:** Used semantic `<mark>` tag with `mix-blend-mode: multiply` and `color: transparent`. Result: Still invisible.

### 1.4 Key Files Involved
-   `src/features/builder/components/DocumentViewerModal.tsx`

### 1.5 Best-Guess Diagnosis
The `react-pdf` (and underlying `pdf.js`) `TextLayer` is tricky.
-   It renders text as transparent `<span>` elements positioned exactly over the canvas text to specific selection.
-   It seems the `TextLayer` CSS or specific rendering logic strips or obscures background colors applied to these spans, or the `z-index` stacking context of the text layer relative to the canvas makes standard background highlights fail to render "on top" visually in a way that matches the user's expectation (or they are being rendered *behind* the opaque canvas).
-   Alternatively, the `customTextRenderer` might be stripping complex styles or not re-rendering as expected when `searchQuery` changes (though the generic re-render trigger seemed correct).

**Potential Solution for Next Agent:**
-   Stop trying to style the text layer directly.
-   Instead, implement a **dedicated Highlight Layer**.
-   When `searchResults` are calculated, also calculate the bounding boxes (if possible) or use the search results to render absolute-positioned `div` highlights *underneath* the text layer but *above* the canvas, or just plain overlays.
-   OR: Investigate if `react-pdf` version 10.x has a specific prop or recommended way to do search highlighting (e.g., standard `pdf.js` has a find controller, but `react-pdf` abstracts this).

---

## PART 2: FULL FILE CONTENTS (Self-Contained)

### File: `src/features/builder/components/DocumentViewerModal.tsx`
```tsx
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
    Menu,
    Settings2,
    Info,
    Search as SearchIcon,
} from "lucide-react";
import { ResearchDocument } from "@prisma/client";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useRef } from "react";

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
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

    // Search State
    const [pdfDocument, setPdfDocument] = useState<any>(null); // PDFDocumentProxy
    const [searchResults, setSearchResults] = useState<{ page: number; strIndex: number }[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        const observer = new ResizeObserver(updateWidth);
        observer.observe(containerRef.current);
        updateWidth(); // Initial

        return () => observer.disconnect();
    }, [isOpen, pdfWorkerReady]);

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
            // Don't reset current page if just reopening? No, reset is better.
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
                    scrollToPage(Math.max(1, currentPage - 1));
                    break;
                case "ArrowRight":
                    scrollToPage(Math.min(numPages, currentPage + 1));
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
    }, [isOpen, numPages, onClose, currentPage]);

    const onDocumentLoadSuccess = useCallback(
        (pdf: any) => {
            setNumPages(pdf.numPages);
            setPdfDocument(pdf);
            setIsLoading(false);
        },
        []
    );

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error("PDF load error:", error);
        setLoadError("Failed to load PDF. The file may be corrupted or unavailable.");
        setIsLoading(false);
    }, []);

    // Search Logic
    useEffect(() => {
        if (!searchQuery || !pdfDocument) {
            setSearchResults([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const performSearch = async () => {
            setIsSearching(true);
            const results: { page: number; strIndex: number }[] = [];
            const query = searchQuery.toLowerCase();

            // Iterate all pages (simple approach)
            // Note: For very large docs, this should be chunked/debounced more carefully
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                try {
                    const page = await pdfDocument.getPage(i);
                    const textContent = await page.getTextContent();
                    const strings = textContent.items.map((item: any) => item.str);
                    
                    // Simple string matching within items
                    // Note: This doesn't handle matches crossing item boundaries (lines), but fits most keywords
                    strings.forEach((str: string, index: number) => {
                        if (str.toLowerCase().includes(query)) {
                            results.push({ page: i, strIndex: index });
                        }
                    });
                } catch (e) {
                    console.error("Error searching page", i, e);
                }
            }

            setSearchResults(results);
            setCurrentMatchIndex(results.length > 0 ? 0 : -1);
            setIsSearching(false);
            
            // Allow auto-jump? Maybe only on Enter.
        };

        const timeoutId = setTimeout(performSearch, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery, pdfDocument]);

    // Jump to match
    const jumpToMatch = (index: number) => {
        if (index >= 0 && index < searchResults.length) {
            setCurrentMatchIndex(index);
            const match = searchResults[index];
            scrollToPage(match.page);
        }
    };
    
    const handleNextMatch = () => jumpToMatch((currentMatchIndex + 1) % searchResults.length);
    const handlePrevMatch = () => jumpToMatch((currentMatchIndex - 1 + searchResults.length) % searchResults.length);

    // Custom Text Renderer for Highlighting
    const textRenderer = useCallback(
        (textItem: any) => {
            if (!searchQuery) return textItem.str;

            const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = textItem.str.split(regex);

            return (
                <>
                    {parts.map((part: string, i: number) => 
                        regex.test(part) ? (
                            <mark 
                                key={i} 
                                style={{ 
                                    backgroundColor: 'rgba(255, 255, 0, 0.6)', 
                                    color: 'transparent',
                                    borderRadius: '2px',
                                    padding: '0 1px',
                                    mixBlendMode: 'multiply'
                                }}
                            >
                                {part}
                            </mark>
                        ) : (
                            part
                        )
                    )}
                </>
            );
        },
        [searchQuery]
    );

    // Scroll to specific page
    const scrollToPage = (page: number) => {
        const pageElement = document.getElementById(`page_${page}`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
            setCurrentPage(page);
        }
    };

    const handleZoomIn = () => setZoom((z) => Math.min(200, z + 25));
    const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
    const handlePrevPage = () => scrollToPage(Math.max(1, currentPage - 1));
    const handleNextPage = () => scrollToPage(Math.min(numPages, currentPage + 1));

    // Track visible page
    useEffect(() => {
        if (!numPages || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.id.replace("page_", ""));
                        if (!isNaN(pageNum)) {
                            setCurrentPage(pageNum);
                        }
                    }
                });
            },
            {
                root: document.getElementById("pdf-scroll-container"),
                threshold: 0.5, // 50% visibility to count as "current"
            }
        );

        // Observe all pages
        for (let i = 1; i <= numPages; i++) {
            const pageEl = document.getElementById(`page_${i}`);
            if (pageEl) observer.observe(pageEl);
        }

        return () => observer.disconnect();
    }, [numPages, isLoading, zoom]);

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
                <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 relative z-20">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 mr-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shrink-0 font-bold text-[10px] md:text-xs">
                            PDF
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm md:text-base font-bold text-white truncate pr-2">
                                {researchDoc.title || researchDoc.fileName}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 hidden md:flex">
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

                    {/* Desktop Controls */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        {/* Search */}
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 ml-1">
                            {isSearching ? (
                                <Loader2 className="w-4 h-4 text-gray-500 mr-2 animate-spin" />
                            ) : (
                                <SearchIcon className="w-4 h-4 text-gray-500 mr-2" />
                            )}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNextMatch();
                                }}
                                placeholder="Search..."
                                className="bg-transparent text-sm text-white placeholder:text-gray-600 outline-none w-32 focus:w-48 transition-all"
                            />
                            {searchResults.length > 0 && (
                                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                        {currentMatchIndex + 1}/{searchResults.length}
                                    </span>
                                    <button onClick={handlePrevMatch} className="p-1 hover:bg-white/10 rounded">
                                        <ChevronLeft className="w-3 h-3 text-gray-400" />
                                    </button>
                                    <button onClick={handleNextMatch} className="p-1 hover:bg-white/10 rounded">
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg">
                            <button
                                onClick={handleZoomOut}
                                disabled={zoom <= 50}
                                className="p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-l-lg"
                                title="Zoom out"
                            >
                                <ZoomOut className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="text-xs font-medium text-gray-400 w-12 text-center">
                                {zoom}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                disabled={zoom >= 200}
                                className="p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-r-lg"
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
                                className="p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-l-lg"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="text-xs font-medium text-gray-400 w-16 text-center">
                                {currentPage}/{numPages || "..."}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="p-2 hover:bg-white/10 disabled:opacity-30 transition-colors rounded-r-lg"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
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
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile Controls (Minimal) */}
                    <div className="flex md:hidden items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 rounded-full text-gray-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* PDF Viewer */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto bg-[#1a1a2e] flex flex-col items-center p-0 md:p-6 pb-20 md:pb-6"
                        id="pdf-scroll-container"
                    >
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
                                className="flex flex-col items-center gap-6 pb-20"
                            >
                                {Array.from(new Array(numPages), (el, index) => (
                                    <div
                                        key={`page_${index + 1}`}
                                        id={`page_${index + 1}`}
                                        className="relative mb-4 last:mb-0 box-border bg-white"
                                        style={{
                                            // Dynamic height accounting for aspect ratio (A4 approx 1.414)
                                            minHeight: isMobile && containerWidth ? `${containerWidth * 1.4}px` : '600px',
                                            width: isMobile && containerWidth ? containerWidth : undefined
                                        }}
                                    >
                                        <Page
                                            pageNumber={index + 1}
                                            width={isMobile && containerWidth ? containerWidth : undefined}
                                            scale={!isMobile ? zoom / 100 : undefined}
                                            renderTextLayer={true} // Enable for search
                                            renderAnnotationLayer={!isMobile}
                                            customTextRenderer={textRenderer}
                                            className="shadow-xl"
                                            loading={
                                                <div
                                                    className="bg-white flex items-center justify-center shadow-lg"
                                                    style={{
                                                        width: isMobile && containerWidth ? `${containerWidth}px` : `${(595 * zoom) / 100}px`,
                                                        height: isMobile && containerWidth ? `${containerWidth * 1.414}px` : `${(842 * zoom) / 100}px`
                                                    }}
                                                >
                                                    <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
                                                </div>
                                            }
                                        />

                                        {/* Desktop Page Number Indicator */}
                                        <div className="absolute -right-12 top-0 text-[10px] text-gray-500 font-mono hidden xl:block">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </Document>
                        )}
                    </div>

                    {/* Mobile Bottom Navigation Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-[#030014]/90 backdrop-blur-lg border-t border-white/10 p-3 md:hidden z-30 flex items-center justify-between pb-safe">
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className={`p-2 rounded-lg transition-colors ${showMobileMenu ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                className="p-2 bg-white/10 rounded-lg disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <span className="text-xs font-medium text-gray-400 min-w-[60px] text-center">
                                {currentPage} / {numPages || "-"}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="p-2 bg-white/10 rounded-lg disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Tools Menu Overlay */}
                    {showMobileMenu && (
                        <div className="absolute bottom-[60px] left-0 right-0 bg-[#0f0f1a] border-t border-white/10 p-4 z-20 md:hidden animate-in slide-in-from-bottom-5 fade-in duration-200 shadow-2xl rounded-t-2xl">
                            <div className="space-y-4">
                                {/* Row 1: Search */}
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                    <SearchIcon className="w-4 h-4 text-gray-500 mr-2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search document..."
                                        className="bg-transparent text-sm text-white placeholder:text-gray-600 outline-none w-full"
                                    />
                                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10 flex-1 justify-end">
                                        <span className="text-[10px] text-gray-400 tabular-nums whitespace-nowrap">
                                            {searchResults.length > 0 ? `${currentMatchIndex + 1}/${searchResults.length}` : '0/0'}
                                        </span>
                                        <button onClick={handlePrevMatch} className="p-1 hover:bg-white/10 rounded">
                                            <ChevronLeft className="w-3 h-3 text-gray-400" />
                                        </button>
                                        <button onClick={handleNextMatch} className="p-1 hover:bg-white/10 rounded">
                                            <ChevronRight className="w-3 h-3 text-gray-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Zoom & Details */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl flex-1 justify-between px-1">
                                        <button
                                            onClick={handleZoomOut}
                                            disabled={zoom <= 50}
                                            className="p-2.5 hover:bg-white/10 disabled:opacity-30 text-gray-400"
                                        >
                                            <ZoomOut className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs font-medium text-white">{zoom}%</span>
                                        <button
                                            onClick={handleZoomIn}
                                            disabled={zoom >= 200}
                                            className="p-2.5 hover:bg-white/10 disabled:opacity-30 text-gray-400"
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowSidebar(true);
                                            setShowMobileMenu(false);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl text-xs font-bold whitespace-nowrap"
                                    >
                                        <Info className="w-4 h-4" />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sidebar - Metadata & Insights */}
                    {showSidebar && (
                        <div className="w-full md:w-80 border-l border-white/10 bg-[#030014] md:bg-black/30 overflow-y-auto shrink-0 absolute md:relative inset-0 md:inset-auto z-40 md:z-0">
                            {/* Mobile close button for sidebar */}
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#030014] sticky top-0 z-10">
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
```

---

## PART 3: DIRECTIVE FOR ORCHESTRATOR

**Attention: Senior AI Orchestrator**

You have received this Escalation Handoff Report. A local agent has failed to solve the "Visible Highlight" problem in the PDF viewer.

**Your Directive:**
1.  **Analyze the Failure:** Review `DocumentViewerModal.tsx`. The search logic is robust, but the `customTextRenderer` approach for highlighting is failing visually (likely due to `react-pdf` text layer opacity/z-index issues).
2.  **Formulate a New Plan:**
    *   Do NOT attempt to style the text layer spans again unless you have a completely different method (e.g., specific `pdf.js` text layer CSS variables).
    *   **Recommended Approach:** Implement an **Overlay Highlight Layer**.
        *   Create a separate absolute-positioned `div` layer on top of the `Page` but below the `TextLayer`.
        *   When matches are found, you need the *coordinates* (`transform` array from `textContent.items`) to position highlight boxes. *Note: The current simple string search does NOT have coordinates. You will need to update the search logic to capture `item.transform` (x, y, width, height) along with the text.*
        *   Render these boxes as simple colored `divs` at the correct absolute positions.
3.  **Execute:** Generate a request for the Builder to refactor the search logic to capture coordinates and render overlay highlights.

**Begin your analysis now.**
