'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';
import { DiagramPreview } from './DiagramPreview';
import { toast } from 'sonner';

interface Diagram {
  id: string;
  title: string;
  diagramType: string;
  mermaidCode: string;
  updatedAt: string;
}

interface DiagramsListProps {
  projectId: string;
  onSelect?: (diagram: Diagram) => void;
  onCreateNew?: () => void;
  className?: string;
}

export function DiagramsList({ projectId, onSelect, onCreateNew, className }: DiagramsListProps) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiagrams = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/diagrams`);
      if (res.ok) {
        const data = await res.json();
        setDiagrams(data);
      }
    } catch (error) {
      console.error('Failed to load diagrams', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [projectId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this diagram?')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/diagrams/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDiagrams(prev => prev.filter(d => d.id !== id));
        toast.success('Diagram deleted');
      }
    } catch (error) {
      toast.error('Failed to delete diagram');
    }
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Project Diagrams</h3>
        {onCreateNew && (
            <Button size="sm" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Diagram
            </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading diagrams...</div>
      ) : diagrams.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
            <p>No diagrams yet.</p>
            {onCreateNew && (
                <Button variant="link" onClick={onCreateNew}>Create your first one</Button>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {diagrams.map(diagram => (
            <Card
                key={diagram.id}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => onSelect?.(diagram)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-medium">{diagram.title}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{diagram.diagramType} • {new Date(diagram.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500 hover:bg-red-950/20"
                        onClick={(e) => handleDelete(diagram.id, e)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
                <div className="h-32 overflow-hidden pointer-events-none relative rounded bg-white/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent z-10" />
                    <DiagramPreview
                        code={diagram.mermaidCode}
                        theme="dark"
                        className="border-0 scale-50 origin-top-left w-[200%] h-[200%]"
                    />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
