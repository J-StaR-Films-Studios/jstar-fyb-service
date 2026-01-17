'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Loader2 } from 'lucide-react';

interface DiagramPreviewProps {
  code: string;
  theme?: 'default' | 'neutral' | 'dark' | 'forest' | 'base';
  className?: string;
  onClick?: () => void;
}

import DOMPurify from 'dompurify';

export function DiagramPreview({ code, theme = 'default', className, onClick }: DiagramPreviewProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid config
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'strict', // Security: Prevent XSS by disabling HTML in diagrams
    });
  }, [theme]);

  // Render diagram when code changes
  useEffect(() => {
    if (!code) return;

    let mounted = true;
    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Sanitize code: remove markdown code blocks if present
        const sanitizedCode = code
          .replace(/^```mermaid\n?/, '')
          .replace(/^```\n?/, '')
          .replace(/```$/, '')
          .trim();

        // Mermaid render returns { svg }
        const { svg } = await mermaid.render(id, sanitizedCode);
        if (mounted) {
          // Sanitize SVG to prevent XSS
          const cleanSvg = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
          setSvg(cleanSvg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (mounted) {
          setError(err.message || 'Failed to render diagram');
          // Keep the old SVG if possible, or show error
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, theme]);

  return (
    <div
      className={`relative border rounded-lg p-4 bg-white/5 overflow-auto min-h-[200px] flex items-center justify-center ${className || ''}`}
      ref={containerRef}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error ? (
        <div className="text-red-400 text-sm p-4 text-center">
          <p className="font-bold mb-1">Rendering Error</p>
          <code className="text-xs break-all">{error}</code>
        </div>
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full flex justify-center"
        />
      )}
    </div>
  );
}
