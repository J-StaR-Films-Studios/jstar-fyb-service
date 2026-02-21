'use client';

import { useState, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

interface DirectUploadWrapperProps {
    projectId: string;
    onUploadStart?: (fileName: string) => void;
    onUploadEnd?: (fileName: string) => void;
    onUploadSuccess?: (doc: any) => void;
    children: (props: { onClick: () => void; isUploading: boolean }) => ReactNode;
}

export function DirectUploadWrapper({ projectId, onUploadStart, onUploadEnd, onUploadSuccess, children }: DirectUploadWrapperProps) {
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so the same file can be uploaded again if needed
        e.target.value = '';

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File exceeds 5MB limit. Please compress your PDF at ilovepdf.com/compress_pdf and try again.");
            return;
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
            toast.error("Only PDF and DOCX files are allowed.");
            return;
        }

        setIsUploading(true);
        if (onUploadStart) onUploadStart(file.name);
        const toastId = toast.loading("Uploading document...");

        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", file);

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

            toast.success("Document uploaded. Starting AI analysis...", { id: toastId });

            if (onUploadSuccess) {
                onUploadSuccess({
                    id: data.doc.id,
                    fileName: file.name,
                    fileType: "file",
                    status: "PENDING",
                    ...data.doc
                });
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to upload document", { id: toastId });
        } finally {
            setIsUploading(false);
            if (onUploadEnd) onUploadEnd(file.name);
        }
    };

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileChange}
            />
            {children({
                onClick: () => inputRef.current?.click(),
                isUploading
            })}
        </>
    );
}
