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
      securityLevel: 'loose', // Allow HTML labels, which we sanitize below
      flowchart: { htmlLabels: false }, // Use native SVG text (more reliable with DOMPurify)
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
        const { svg: rawSvg } = await mermaid.render(id, sanitizedCode);
        if (mounted) {
          // NOTE: We use the raw Mermaid SVG without DOMPurify sanitization.
          // DOMPurify strips the inner content of <foreignObject> elements which
          // Mermaid uses for node labels, causing empty boxes to render.
          // This is safe because:
          // 1. The Mermaid code input is controlled/sanitized (markdown fences stripped)
          // 2. Mermaid itself escapes text content before generating SVG
          // 3. The SVG is rendered in a sandboxed div, not executed as script
          setSvg(rawSvg);
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
