"use client";

import React from "react";
import { Download, DownloadCloud, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
    type: "DOC" | "PDF";
    filename: string;
    size: string;
    status: "ready" | "compiling" | "failed";
    downloadUrl?: string;
}

const ResourceCard = ({ type, filename, size, status, downloadUrl }: ResourceCardProps) => {
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!downloadUrl) return;

        try {
            setIsDownloading(true);
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename; // Force download with correct filename
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed", error);
            // Fallback: Open in new tab if blob fetch fails
            window.open(downloadUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div
            className={cn(
                "p-4 rounded-md bg-writing text-ink flex items-center justify-between group cursor-pointer border border-rule transition-colors",
                status === "ready" ? "hover:bg-selection" : "cursor-not-allowed"
            )}
        >
            <div className="flex items-center gap-4">
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                        type === "DOC" && "bg-selection text-ink",
                        type === "PDF" && "bg-selection text-ink"
                    )}
                >
                    {type}
                </div>
                <div>
                    <p className="font-bold text-sm text-ink">{filename}</p>
                    <p className="text-xs text-ink-muted">
                        {status === "ready" ? `${size} • Ready` : status === "failed" ? "Processing failed" : "Processing..."}
                    </p>
                </div>
            </div>
            {status === "ready" && downloadUrl ? (
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-11 h-11 rounded-md border border-rule flex items-center justify-center hover:bg-selection transition-colors disabled:opacity-50"
                >
                    {isDownloading ? (
                        <Loader2 className="w-4 h-4 text-rust animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 text-ink-muted group-hover:text-rust transition-colors" />
                    )}
                </button>
            ) : status === "compiling" ? (
                <Loader2 className="w-4 h-4 text-ink-muted animate-spin" aria-label="Processing" />
            ) : null}
        </div>
    );
};

import { ResearchDocument } from "@prisma/client";

// Define a partial type for what we actually need
type DashboardDocument = Pick<ResearchDocument, "id" | "fileType" | "fileName" | "status" | "fileUrl">;

export const ResourceDownloads = ({ documents }: { documents: DashboardDocument[] | undefined }) => {
    return (
        <div>
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-rust" /> Resources
            </h3>
            <div className="space-y-3">
                {documents && documents.length > 0 ? (
                    documents.map((doc) => (
                        <ResourceCard
                            key={doc.id}
                            type={doc.fileType === "pdf" ? "PDF" : "DOC"}
                            filename={doc.fileName}
                            size="N/A" // Size not in schema yet
                            status={doc.status === "PROCESSED" ? "ready" : doc.status === "FAILED" || doc.status === "ERROR" ? "failed" : "compiling"}
                            downloadUrl={`/api/documents/${doc.id}/serve`}
                        />
                    ))
                ) : (
                    <div className="p-4 rounded-md bg-writing text-ink text-center text-ink-muted text-sm">
                        No resources available yet.
                    </div>
                )}
            </div>
        </div>
    );
};
