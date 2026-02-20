"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDocumentFormProps {
    projectId: string;
    onUploadSuccess: (doc: any) => void;
}

export function UploadDocumentForm({ projectId, onUploadSuccess }: UploadDocumentFormProps) {
    const [mode, setMode] = useState<"upload" | "link">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState("");
    const [isUploading, setIsUploading] = useState(false);

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

            // Note: extraction is handled by parent or by background job
            onUploadSuccess({
                id: data.doc.id,
                fileName: mode === "upload" ? file!.name : "External Link",
                fileType: mode === "upload" ? "file" : "link",
                status: "PENDING",
                ...data.doc
            });

            setFile(null);
            setLink("");
        } catch (error) {
            console.error("Upload error:", error);
            alert(error instanceof Error ? error.message : "Failed to upload document");
        } finally {
            setIsUploading(false);
        }
    };

    return (
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
    );
}

