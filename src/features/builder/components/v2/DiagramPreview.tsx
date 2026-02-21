'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

// Dynamic imports for mermaid & DOMPurify to prevent chunk loading failures.
// These are HUGE libraries (~1.5MB+) that Next.js code-splits into separate chunks.
// Static imports cause "Failed to load chunk" errors when chunk hashes go stale
// after HMR updates or dev server restarts.
let mermaidInstance: typeof import('mermaid').default | null = null;
let purifyInstance: typeof import('dompurify').default | null = null;

async function loadMermaid() {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
  }
  return mermaidInstance;
}

async function loadDOMPurify() {
  if (!purifyInstance) {
    const mod = await import('dompurify');
    purifyInstance = mod.default;
  }
  return purifyInstance;
}

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
  const [isChunkError, setIsChunkError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderDiagram = useCallback(async () => {
    if (!code) return;

    setIsLoading(true);
    setError(null);
    setIsChunkError(false);

    try {
      // Dynamically load both libraries
      const [mermaid, DOMPurify] = await Promise.all([
        loadMermaid(),
        loadDOMPurify(),
      ]);

      // Initialize mermaid config
      mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        securityLevel: 'strict', // Sentinel: Force strict security to prevent XSS
        suppressErrorRendering: true,
      });

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

      // Sanitize code: remove markdown code blocks if present
      const sanitizedCode = code
        .replace(/^```mermaid\n?/, '')
        .replace(/^```\n?/, '')
        .replace(/```$/, '')
        .trim();

      // Mermaid render returns { svg }
      const { svg: rawSvg } = await mermaid.render(id, sanitizedCode);

      // Sentinel: Sanitize SVG before rendering to prevent XSS
      const cleanSvg = DOMPurify.sanitize(rawSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['foreignObject'],
        ADD_ATTR: ['target']
      });
      setSvg(cleanSvg);
    } catch (err) {
      console.error('Mermaid render error:', err);

      // Detect chunk loading errors specifically
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isChunk = errorMsg.includes('Failed to load chunk') ||
        errorMsg.includes('Loading chunk') ||
        errorMsg.includes('ChunkLoadError');

      setIsChunkError(isChunk);
      setError(isChunk
        ? 'Diagram library failed to load. Click retry to try again.'
        : (err instanceof Error ? err.message : 'Failed to render diagram')
      );

      // Sentinel: Cleanup Mermaid error elements to prevent layout issues
      const d3Error = document.querySelector('#d3-mermaid-error-container');
      if (d3Error) d3Error.remove();
      document.querySelectorAll('[id^="d3-mermaid-error-"]').forEach(el => el.remove());
    } finally {
      setIsLoading(false);
    }
  }, [code, theme]);

  // Render diagram when code or theme changes
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      await renderDiagram();
    };

    if (mounted) run();

    return () => {
      mounted = false;
    };
  }, [renderDiagram]);

  const handleRetry = () => {
    // Reset the cached instances to force a fresh import
    mermaidInstance = null;
    purifyInstance = null;
    renderDiagram();
  };

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
          {isChunkError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-md bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
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
