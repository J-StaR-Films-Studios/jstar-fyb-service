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
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Insert Image
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => { setTab('upload'); setError(null); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            tab === 'upload' ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload
                        </div>
                        {tab === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button
                        onClick={() => { setTab('web'); setError(null); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            tab === 'web' ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Web URL
                        </div>
                        {tab === 'web' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Input Area */}
                    <div className="min-h-[150px]">
                        {tab === 'upload' ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all group"
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
                                        <p className="font-medium text-white mb-1 truncate max-w-[200px]">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Click to upload image</p>
                                        <p className="text-xs text-gray-600 mt-1">Max 5MB (JPEG, PNG, WEBP, GIF)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Image URL</label>
                                <div className="flex items-center gap-2 bg-black/20 border border-white/10 focus-within:border-primary/50 rounded-lg px-3 py-2 transition-colors">
                                    <LinkIcon className="w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="https://example.com/image.jpg"
                                        value={webUrl}
                                        onChange={handleWebUrlChange}
                                        className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-gray-600"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    Paste the direct link to an image on the web.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {previewUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center h-48">
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
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Width (Opt)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 500px or 100%"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 focus:border-primary/50 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Height (Opt)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 300px"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 focus:border-primary/50 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={tab === 'upload' ? handleUploadAndInsert : handleWebInsert}
                        disabled={(!selectedFile && tab === 'upload') || (!webUrl && tab === 'web') || isUploading}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
