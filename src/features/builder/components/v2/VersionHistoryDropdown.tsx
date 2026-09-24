'use client';

import { useState, useEffect } from 'react';
import { History, Clock, RotateCcw, Eye, X, Loader2, FileDiff, FileText, Columns, AlignJustify } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { useMediaQuery } from '../../../../hooks/use-media-query';

interface Version {
    version: number;
    content: string;
    createdAt: string;
    wordCount?: number;
}

interface VersionHistoryDropdownProps {
    projectId: string;
    chapterNumber: number;
    currentVersion: number;
    currentContent?: string;
    onRestore: (content: string) => void;
}

export function VersionHistoryDropdown({
    projectId,
    chapterNumber,
    currentVersion,
    currentContent = '',
    onRestore
}: VersionHistoryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewVersion, setPreviewVersion] = useState<Version | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [viewMode, setViewMode] = useState<'raw' | 'diff'>('diff');
    const [diffMode, setDiffMode] = useState<'split' | 'unified'>('unified');

    const isDesktop = useMediaQuery("(min-width: 1024px)");

    useEffect(() => {
        if (isDesktop) setDiffMode('split');
        else setDiffMode('unified');
    }, [isDesktop]);

    // Fetch versions when dropdown opens
    useEffect(() => {
        if (isOpen && versions.length === 0) {
            fetchVersions();
        }
    }, [isOpen]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}/versions`);
            if (res.ok) {
                const data = await res.json();
                // Add word count to each version
                const versionsWithCount = (data.versions || []).map((v: Version) => ({
                    ...v,
                    wordCount: v.content?.trim().split(/\s+/).length || 0
                })).sort((a: Version, b: Version) => b.version - a.version);
                setVersions(versionsWithCount);
            }
        } catch (error) {
            console.error('Failed to fetch versions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (version: Version) => {
        setRestoring(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/chapters/${chapterNumber}/versions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: version.version, content: version.content })
            });

            if (res.ok) {
                onRestore(version.content);
                setIsOpen(false);
                setPreviewVersion(null);
            }
        } catch (error) {
            console.error('Failed to restore version:', error);
        } finally {
            setRestoring(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-selection rounded text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5"
                title="Version History"
            >
                <History className="w-4 h-4" />
                <span className="text-xs hidden md:inline">v{currentVersion}</span>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-72 bg-writing border border-rule rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-rule flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-ink">Version History</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-ink-muted hover:text-ink p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-ink-muted" />
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="p-6 text-center text-ink-muted text-sm">
                                    No previous versions yet.
                                    <br />
                                    <span className="text-xs">Versions are created when you generate or edit content.</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-rule">
                                    {versions.map((v, idx) => (
                                        <div
                                            key={v.version}
                                            className="p-3 hover:bg-selection transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-ink">
                                                    Version {v.version}
                                                    {idx === 0 && <span className="ml-2 text-xs text-ink">(Latest)</span>}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setPreviewVersion(v);
                                                            setViewMode('diff');
                                                        }}
                                                        className="p-1.5 hover:bg-selection rounded text-ink-muted hover:text-ink"
                                                        title="Preview & Diff"
                                                    >
                                                        <FileDiff className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRestore(v)}
                                                        disabled={restoring}
                                                        className="p-1.5 hover:bg-selection rounded text-ink-muted hover:text-rust"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-ink-muted">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(v.createdAt)}
                                                <span>•</span>
                                                <span>{v.wordCount} words</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Preview Modal */}
            {previewVersion && (

                <div className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewVersion(null)} />

                    <div className={`relative bg-writing border border-rule rounded-2xl w-full ${viewMode === 'diff' && diffMode === 'split' ? 'max-w-7xl' : 'max-w-3xl'} max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto`}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-rule bg-selection flex flex-col gap-4 shrink-0">
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                                        Version {previewVersion.version}
                                        <span className="text-xs font-normal text-ink-muted bg-selection px-2 py-0.5 rounded-full border border-rule">
                                            {formatDate(previewVersion.createdAt)}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rust"></span>
                                        {previewVersion.wordCount} words
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Desktop View Toggles */}
                                    {isDesktop && (
                                        <>
                                            <div className="flex bg-paper p-1 rounded-lg border border-rule">
                                                <button
                                                    onClick={() => setViewMode('diff')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'diff' ? 'bg-rust text-writing shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                                                >
                                                    <FileDiff className="w-3.5 h-3.5" />
                                                    Changes
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('raw')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'raw' ? 'bg-rust text-writing shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Full Text
                                                </button>
                                            </div>

                                            {viewMode === 'diff' && (
                                                <div className="flex bg-paper p-1 rounded-lg border border-rule">
                                                    <button
                                                        onClick={() => setDiffMode('split')}
                                                        className={`p-1.5 rounded-md transition-all ${diffMode === 'split' ? 'bg-selection text-ink' : 'text-ink-muted hover:text-ink'}`}
                                                        title="Split View"
                                                    >
                                                        <Columns className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDiffMode('unified')}
                                                        className={`p-1.5 rounded-md transition-all ${diffMode === 'unified' ? 'bg-selection text-ink' : 'text-ink-muted hover:text-ink'}`}
                                                        title="Unified View"
                                                    >
                                                        <AlignJustify className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="h-6 w-px bg-selection" />

                                            <button
                                                onClick={() => handleRestore(previewVersion)}
                                                disabled={restoring}
                                                className="px-4 py-2 bg-rust hover:bg-rust/90 text-writing text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-none disabled:opacity-50 disabled:shadow-none"
                                            >
                                                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                <span>Restore Version</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setPreviewVersion(null)}
                                        className="p-2 hover:bg-selection text-ink-muted hover:text-ink rounded-lg transition-colors border border-transparent hover:border-rule"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {!isDesktop && (
                                <div className="flex w-full bg-paper p-1 rounded-lg border border-rule">
                                    <button
                                        onClick={() => setViewMode('diff')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${viewMode === 'diff' ? 'bg-selection text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                                    >
                                        <FileDiff className="w-3.5 h-3.5" /> Changes
                                    </button>
                                    <button
                                        onClick={() => setViewMode('raw')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${viewMode === 'raw' ? 'bg-selection text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Full Text
                                    </button>
                                </div>
                            )}
                        </div>



                        {/* Diff Legend (Fixed) */}
                        {viewMode === 'diff' && (
                            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider px-6 py-2 bg-writing border-b border-rule shadow-sm shrink-0 z-20">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                                    <span className="text-ink-muted">Removed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                                    <span className="text-ink-muted">Added</span>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto bg-paper p-0 relative">
                            {viewMode === 'diff' ? (
                                <div className="min-h-full">
                                    <div className="p-4 sm:p-6 pb-24 sm:pb-6">
                                        <DiffViewer
                                            oldText={previewVersion.content}
                                            newText={currentContent}
                                            mode={diffMode}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 sm:p-6 pb-24 sm:pb-6">
                                    <pre className="text-sm text-ink whitespace-pre-wrap font-serif leading-relaxed max-w-3xl mx-auto">
                                        {previewVersion.content}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Mobile Restore Footer */}
                        {!isDesktop && (
                            <div className="p-4 border-t border-rule bg-paper backdrop-blur pb-safe shrink-0">
                                <button
                                    onClick={() => handleRestore(previewVersion)}
                                    disabled={restoring}
                                    className="w-full py-3 bg-rust hover:bg-rust/90 text-writing text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-none disabled:opacity-50 disabled:shadow-none"
                                >
                                    {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                    Restore This Version
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
