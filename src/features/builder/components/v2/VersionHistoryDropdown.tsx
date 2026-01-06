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
                className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
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
                    <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Version History</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No previous versions yet.
                                    <br />
                                    <span className="text-xs">Versions are created when you generate or edit content.</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {versions.map((v, idx) => (
                                        <div
                                            key={v.version}
                                            className="p-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-white">
                                                    Version {v.version}
                                                    {idx === 0 && <span className="ml-2 text-xs text-green-400">(Latest)</span>}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setPreviewVersion(v);
                                                            setViewMode('diff');
                                                        }}
                                                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                                        title="Preview & Diff"
                                                    >
                                                        <FileDiff className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRestore(v)}
                                                        disabled={restoring}
                                                        className="p-1.5 hover:bg-primary/20 rounded text-gray-400 hover:text-primary"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
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

                    <div className={`relative bg-[#0A0A0A] border border-white/10 rounded-2xl w-full ${viewMode === 'diff' && diffMode === 'split' ? 'max-w-7xl' : 'max-w-3xl'} max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto`}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex flex-col gap-4 shrink-0">
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        Version {previewVersion.version}
                                        <span className="text-xs font-normal text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            {formatDate(previewVersion.createdAt)}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                                        {previewVersion.wordCount} words
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Desktop View Toggles */}
                                    {isDesktop && (
                                        <>
                                            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                                <button
                                                    onClick={() => setViewMode('diff')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'diff' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                                >
                                                    <FileDiff className="w-3.5 h-3.5" />
                                                    Changes
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('raw')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'raw' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Full Text
                                                </button>
                                            </div>

                                            {viewMode === 'diff' && (
                                                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                                    <button
                                                        onClick={() => setDiffMode('split')}
                                                        className={`p-1.5 rounded-md transition-all ${diffMode === 'split' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                                        title="Split View"
                                                    >
                                                        <Columns className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDiffMode('unified')}
                                                        className={`p-1.5 rounded-md transition-all ${diffMode === 'unified' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                                        title="Unified View"
                                                    >
                                                        <AlignJustify className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="h-6 w-px bg-white/10" />

                                            <button
                                                onClick={() => handleRestore(previewVersion)}
                                                disabled={restoring}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
                                            >
                                                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                <span>Restore Version</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setPreviewVersion(null)}
                                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/5"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {!isDesktop && (
                                <div className="flex w-full bg-black/20 p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setViewMode('diff')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${viewMode === 'diff' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <FileDiff className="w-3.5 h-3.5" /> Changes
                                    </button>
                                    <button
                                        onClick={() => setViewMode('raw')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${viewMode === 'raw' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Full Text
                                    </button>
                                </div>
                            )}
                        </div>



                        {/* Diff Legend (Fixed) */}
                        {viewMode === 'diff' && (
                            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider px-6 py-2 bg-[#0A0A0A] border-b border-white/5 shadow-sm shrink-0 z-20">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                                    <span className="text-gray-400">Removed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                                    <span className="text-gray-400">Added</span>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto bg-[#050505] p-0 relative">
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
                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-serif leading-relaxed max-w-3xl mx-auto">
                                        {previewVersion.content}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Mobile Restore Footer */}
                        {!isDesktop && (
                            <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur pb-safe shrink-0">
                                <button
                                    onClick={() => handleRestore(previewVersion)}
                                    disabled={restoring}
                                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
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
