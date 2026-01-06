"use client";

import { AlertTriangle, X, Info, CheckCircle } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info" | "success";
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger",
    isLoading = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const typeStyles = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
            button: "bg-red-500 hover:bg-red-600 text-white",
            iconBg: "bg-red-500/10",
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />,
            button: "bg-yellow-500 hover:bg-yellow-600 text-black",
            iconBg: "bg-yellow-500/10",
        },
        info: {
            icon: <Info className="w-6 h-6 text-blue-400" />,
            button: "bg-blue-500 hover:bg-blue-600 text-white",
            iconBg: "bg-blue-500/10",
        },
        success: {
            icon: <CheckCircle className="w-6 h-6 text-green-400" />,
            button: "bg-green-500 hover:bg-green-600 text-white",
            iconBg: "bg-green-500/10",
        },
    };

    const styles = typeStyles[type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-gray-400 text-sm">{message}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${styles.button}`}
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
