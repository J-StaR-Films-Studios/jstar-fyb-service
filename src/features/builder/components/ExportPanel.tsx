'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import mermaid from 'mermaid';

interface ExportPanelProps {
  projectId: string;
}

export function ExportPanel({ projectId }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    toast.info('Preparing document...');

    try {
      // 1. Gather all diagrams currently in the DOM or fetch chapter content to find them.
      // Since we need to match what the server sees (the code strings), we should iterate the chapters via API?
      // No, let's just grab ALL mermaid diagrams rendered on screen if possible, OR
      // Better: Fetch all diagrams from the project (using our new API) and render them invisibly to generate images.

      const diagramsRes = await fetch(`/api/projects/${projectId}/diagrams`);
      if (!diagramsRes.ok) throw new Error('Failed to fetch diagrams metadata');
      const savedDiagrams = await diagramsRes.json();

      const imageMap: Record<string, string> = {};

      // Initialize mermaid
      mermaid.initialize({ startOnLoad: false, theme: 'default' });

      // Render each diagram to SVG -> Canvas -> Base64
      // Note: We need the diagrams that are IN THE TEXT.
      // The text stores them as <mermaid-diagram code="...">.
      // So we just need to render the code.

      // We'll iterate all saved diagrams PLUS we might scan the editor content if we had access.
      // For now, let's assume we just export Saved Diagrams that might be referenced.
      // Or actually, let's render every saved diagram's code.

      for (const diag of savedDiagrams) {
         try {
             const id = `export-${Math.random().toString(36).slice(2)}`;
             const { svg } = await mermaid.render(id, diag.mermaidCode);

             // Convert SVG to Base64 (simple approach, might fail in Word if not proper image)
             // DOCX usually wants a buffer. We can send base64 of the image.
             // SVG to PNG conversion is safer for Word.

             const img = new Image();
             const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
             const url = URL.createObjectURL(svgBlob);

             await new Promise((resolve, reject) => {
                 img.onload = resolve;
                 img.onerror = reject;
                 img.src = url;
             });

             const canvas = document.createElement('canvas');
             canvas.width = 1200; // High res
             canvas.height = (img.height / img.width) * 1200;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.fillStyle = 'white';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                 const pngData = canvas.toDataURL('image/png');

                 // Map code to image
                 imageMap[diag.mermaidCode] = pngData;
             }
             URL.revokeObjectURL(url);

         } catch (e) {
             console.error('Failed to render diagram for export', e);
         }
      }

      // 2. Call Export API
      const response = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagrams: imageMap }),
      });

      if (!response.ok) throw new Error('Export failed');

      // 3. Download Blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId.slice(0, 6)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export complete!');

    } catch (error) {
      console.error(error);
      toast.error('Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-gray-900/50 space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h3 className="font-semibold text-lg">Export Project</h3>
            <p className="text-sm text-muted-foreground">Download as .docx with diagrams included.</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download DOCX
        </Button>
      </div>
    </div>
  );
}
