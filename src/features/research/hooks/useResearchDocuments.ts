'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// useResearchDocuments — Shared hook for research document ops
// Used by both FloatingResearchPanel (Builder) and DocumentUpload (Workspace)
// ============================================================

type ViewMode = 'all' | 'academic' | 'web' | 'uploaded';
type AccessFilter = 'all' | 'open' | 'paywalled';

interface UseResearchDocumentsOptions {
    projectId: string;
    searchQuery?: string;
    viewMode?: ViewMode;
    accessFilter?: AccessFilter;
}

export function useResearchDocuments({
    projectId,
    searchQuery = '',
    viewMode = 'all',
    accessFilter = 'all',
}: UseResearchDocumentsOptions) {
    // ── Core State ──────────────────────────────────────────
    const [documents, setDocuments] = useState<any[]>([]);
    const [extractingDocs, setExtractingDocs] = useState<Record<string, boolean>>({});
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

    // ── Fetch Documents (with cache-bust) ───────────────────
    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch(`/api/documents?projectId=${projectId}&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error('[useResearchDocuments] Failed to fetch:', error);
        }
    }, [projectId]);

    // Initial load
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // ── Categorization ──────────────────────────────────────
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

        // Sort academic by citation count (descending)
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
                paywalled: paywalledCount,
            },
        };
    }, [documents]);

    // ── Filtering ───────────────────────────────────────────
    const filteredDocs = useMemo(() => {
        let docs: any[] = [];
        switch (viewMode) {
            case 'academic':
                docs = academicPapers;
                if (accessFilter !== 'all') {
                    docs = docs.filter((doc) => {
                        const hasOpen = doc.openAccessUrl && doc.openAccessUrl.length > 0;
                        return accessFilter === 'open' ? hasOpen : !hasOpen;
                    });
                }
                break;
            case 'web':
                docs = webSources;
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
    }, [viewMode, academicPapers, webSources, uploadedDocs, documents, searchQuery, accessFilter]);

    // ── Extract (single doc) ────────────────────────────────
    const handleExtract = useCallback(
        async (documentId: string) => {
            setExtractingDocs((prev) => ({ ...prev, [documentId]: true }));
            try {
                const res = await fetch(`/api/documents/${documentId}/extract`, { method: 'POST' });
                if (!res.ok) throw new Error('Extraction failed');
                await fetchDocuments();
            } catch (error) {
                console.error('[useResearchDocuments] Extraction error:', error);
                await fetchDocuments();
            } finally {
                setExtractingDocs((prev) => ({ ...prev, [documentId]: false }));
            }
        },
        [fetchDocuments]
    );

    // ── Manual PDF Fetch (single doc) ───────────────────────
    const handleManualFetch = useCallback(
        async (documentId: string) => {
            setExtractingDocs((prev) => ({ ...prev, [documentId]: true }));
            try {
                await fetch(`/api/documents/${documentId}/fetch-pdf`, { method: 'POST' });
                await fetch(`/api/documents/${documentId}/extract`, { method: 'POST' });
                await fetchDocuments();
            } catch (error) {
                console.error('[useResearchDocuments] Manual fetch error:', error);
                await fetchDocuments();
            } finally {
                setExtractingDocs((prev) => ({ ...prev, [documentId]: false }));
            }
        },
        [fetchDocuments]
    );

    // ── Delete ──────────────────────────────────────────────
    const handleDelete = useCallback(
        async (documentId: string) => {
            try {
                const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
                if (res.ok) {
                    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
                }
            } catch (error) {
                console.error('[useResearchDocuments] Delete error:', error);
            }
        },
        []
    );

    // ── Sync to AI ──────────────────────────────────────────
    const handleSyncAll = useCallback(
        async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/research/sync`, { method: 'POST' });
                if (res.ok) {
                    await fetchDocuments();
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        },
        [projectId, fetchDocuments]
    );

    // ── Batch Processing (Deep Research) ────────────────────
    const handleResearchComplete = useCallback(
        async (savedDocIds: string[]) => {
            await fetchDocuments();

            if (savedDocIds.length === 0) return;

            setIsProcessingBatch(true);

            for (let i = 0; i < savedDocIds.length; i++) {
                const docId = savedDocIds[i];
                console.log(`[useResearchDocuments] Processing ${i + 1}/${savedDocIds.length}: ${docId}`);

                try {
                    // Step 1: Fetch PDF if open access
                    const doc = documents.find((d) => d.id === docId);
                    if (doc?.openAccessUrl) {
                        await fetch(`/api/documents/${docId}/fetch-pdf`, { method: 'POST' });
                    }

                    // Step 2: Extract & sync
                    await fetch(`/api/documents/${docId}/extract`, { method: 'POST' });
                } catch (error) {
                    console.error(`[useResearchDocuments] Failed to process ${docId}:`, error);
                }

                // Delay between docs to respect rate limits
                if (i < savedDocIds.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }

                // Refresh UI after each doc
                await fetchDocuments();
            }

            setIsProcessingBatch(false);
            await fetchDocuments();
        },
        [fetchDocuments, documents]
    );

    // ── Upload Handler ──────────────────────────────────────
    const handleUpload = useCallback(
        async (formData: FormData) => {
            const res = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(error.error || 'Upload failed');
            }

            const data = await res.json();

            // Add to local state immediately
            setDocuments((prev) => [...prev, data.doc]);

            // Auto-extract after upload
            if (data.doc?.id) {
                await handleExtract(data.doc.id);
            }

            return data.doc;
        },
        [handleExtract]
    );

    // ── beforeunload guard ──────────────────────────────────
    useEffect(() => {
        const hasActiveWork =
            isProcessingBatch || Object.values(extractingDocs).some(Boolean);

        if (!hasActiveWork) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isProcessingBatch, extractingDocs]);

    return {
        // State
        documents,
        filteredDocs,
        extractingDocs,
        isProcessingBatch,
        counts,
        academicPapers,
        webSources,
        uploadedDocs,

        // Actions
        fetchDocuments,
        handleExtract,
        handleManualFetch,
        handleDelete,
        handleSyncAll,
        handleResearchComplete,
        handleUpload,
    };
}
