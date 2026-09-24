'use client';

import { useState, useRef } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerDialogProps {
    projectId: string;
    onClose: () => void;
    onInsert: (markdown: string) => void;
}

type Tab = 'upload' | 'web';

export function ImagePickerDialog({ projectId, onClose, onInsert }: ImagePickerDialogProps) {
    const [tab, setTab] = useState<Tab>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [webUrl, setWebUrl] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }

        setError(null);
        setSelectedFile(file);

        // Create local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadAndInsert = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('projectId', projectId);

            const res = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await res.json();
            const imageUrl = `/api/documents/${data.doc.id}/serve`;

            insertImage(imageUrl);

        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload image');
            setIsUploading(false);
        }
    };

    const handleWebInsert = () => {
        if (!webUrl) {
            setError('Please enter a valid URL');
            return;
        }
        insertImage(webUrl);
    };

    const insertImage = (url: string) => {
        let markdown = '';
        if (width || height) {
            markdown = `<img src="${url}" alt="Image"`;
            if (width) markdown += ` width="${width}"`;
            if (height) markdown += ` height="${height}"`;
            markdown += ` />`;
        } else {
            markdown = `![Image](${url})`;
        }

        onInsert(markdown);
        onClose();
    };

    const handleWebUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWebUrl(e.target.value);
        setPreviewUrl(e.target.value);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-writing border border-rule rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
                    <h2 className="font-semibold text-ink flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-rust" />
                        Insert Image
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-selection rounded-lg text-ink-muted hover:text-ink transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-rule">
                    <button
                        onClick={() => { setTab('upload'); setError(null); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            tab === 'upload' ? "text-ink" : "text-ink-muted hover:text-ink hover:bg-selection"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload
                        </div>
                        {tab === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rust" />}
                    </button>
                    <button
                        onClick={() => { setTab('web'); setError(null); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            tab === 'web' ? "text-ink" : "text-ink-muted hover:text-ink hover:bg-selection"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Web URL
                        </div>
                        {tab === 'web' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rust" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Input Area */}
                    <div className="min-h-[150px]">
                        {tab === 'upload' ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-rule hover:border-rust hover:bg-selection rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                                {selectedFile ? (
                                    <div className="text-center">
                                        <p className="font-medium text-ink mb-1 truncate max-w-[200px]">{selectedFile.name}</p>
                                        <p className="text-xs text-ink-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-selection flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Upload className="w-5 h-5 text-ink-muted group-hover:text-rust" />
                                        </div>
                                        <p className="text-sm text-ink-muted font-medium">Click to upload image</p>
                                        <p className="text-xs text-ink-muted mt-1">Max 5MB (JPEG, PNG, WEBP, GIF)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider">Image URL</label>
                                <div className="flex items-center gap-2 bg-paper border border-rule focus-within:border-rust rounded-lg px-3 py-2 transition-colors">
                                    <LinkIcon className="w-4 h-4 text-ink-muted" />
                                    <input
                                        type="text"
                                        placeholder="https://example.com/image.jpg"
                                        value={webUrl}
                                        onChange={handleWebUrlChange}
                                        className="bg-transparent border-none outline-none text-ink text-sm w-full placeholder:text-ink-muted"
                                    />
                                </div>
                                <p className="text-xs text-ink-muted">
                                    Paste the direct link to an image on the web.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {previewUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-paper border border-rule flex items-center justify-center h-48">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-full max-w-full object-contain"
                                onError={() => setError('Failed to load image preview')}
                            />
                        </div>
                    )}

                    {/* Size Options (Optional) */}
                    {(selectedFile || (tab === 'web' && webUrl)) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">Width (Opt)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 500px or 100%"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    className="w-full bg-paper border border-rule focus:border-rust rounded-lg px-3 py-2 text-ink text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">Height (Opt)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 300px"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full bg-paper border border-rule focus:border-rust rounded-lg px-3 py-2 text-ink text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 text-ink text-sm bg-paper p-3 rounded-lg border border-rule">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-rule flex justify-end gap-3 bg-paper">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-ink-muted hover:text-ink transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={tab === 'upload' ? handleUploadAndInsert : handleWebInsert}
                        disabled={(!selectedFile && tab === 'upload') || (!webUrl && tab === 'web') || isUploading}
                        className="flex items-center gap-2 px-6 py-2 bg-rust text-writing rounded-lg hover:bg-rust/90 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Insert Image
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
