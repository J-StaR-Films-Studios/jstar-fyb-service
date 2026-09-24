'use client';

import { useEffect, useRef } from 'react';

export interface ProjectDetail {
    id: string;
    title: string;
    category: string;
    summary: string;
    description: string;
    heroImage: string;
    techStack: string[];
    metrics: { codeQuality: number; performance: string };
    features: { title: string; desc: string }[];
    deliverables: string[];
    screenshots: string[];
    gradient: string;
}

interface ProjectDetailModalProps {
    project: ProjectDetail | null;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

export function ProjectDetailModal({ project, isOpen, onClose, onNext, onPrev }: ProjectDetailModalProps) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (!isOpen) return;
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            triggerRef.current?.focus();
        };
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Tab') {
                const controls = [closeRef.current, ...Array.from(document.querySelectorAll<HTMLButtonElement>('[data-concept-nav]'))].filter((button): button is HTMLButtonElement => Boolean(button));
                const index = controls.indexOf(document.activeElement as HTMLButtonElement);
                if (event.shiftKey && index <= 0) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
                else if (!event.shiftKey && index === controls.length - 1) { event.preventDefault(); controls[0]?.focus(); }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !project) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="concept-title" aria-describedby="concept-note" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-md border border-rule bg-writing p-6 text-ink shadow-xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <p className="font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">{project.category} · Concept</p>
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close project concept" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-rule text-ink">✕</button>
                </div>
                <h2 id="concept-title" className="mt-5 text-2xl font-bold sm:text-3xl">{project.title}</h2>
                <p id="concept-note" className="mt-4 leading-relaxed text-ink-muted">An illustrative direction, not a completed project or verified student result. Use it as a starting point for your own topic.</p>
                <p className="mt-6 font-margin-mono text-xs font-semibold uppercase text-ink-muted">Possible tools</p>
                <div className="mt-3 flex flex-wrap gap-2">{project.techStack.map(tech => <span key={tech} className="rounded border border-rule bg-paper px-3 py-2 text-sm">{tech}</span>)}</div>
                <div className="mt-8 flex gap-3 border-t border-rule pt-6">
                    <button data-concept-nav type="button" onClick={onPrev} className="min-h-11 rounded-md border border-rule px-4 font-semibold hover:bg-selection">Previous</button>
                    <button data-concept-nav type="button" onClick={onNext} className="min-h-11 rounded-md border border-rule px-4 font-semibold hover:bg-selection">Next</button>
                </div>
            </div>
        </div>
    );
}
