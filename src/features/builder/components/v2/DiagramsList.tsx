'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';
import { DiagramPreview } from './DiagramPreview';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Diagram {
  id: string;
  title: string;
  diagramType: string;
  mermaidCode: string;
  description?: string;
  updatedAt: string;
}

interface DiagramsListProps {
  projectId: string;
  onSelect?: (diagram: Diagram) => void;
  onCreateNew?: () => void;
  onInsert?: (diagram: Diagram) => void;
  className?: string;
}

export function DiagramsList({ projectId, onSelect, onCreateNew, onInsert, className }: DiagramsListProps) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

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

    // Optimistic update
    const previousDiagrams = [...diagrams];
    setDiagrams(prev => prev.filter(d => d.id !== id));

    toast.success('Diagram deleted', {
      action: {
        label: 'Undo',
        onClick: () => setDiagrams(previousDiagrams)
      }
    });

    try {
      const res = await fetch(`/api/projects/${projectId}/diagrams/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      // Revert on failure if not undone
      setDiagrams(previousDiagrams);
      toast.error('Failed to delete diagram');
    }
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Project Diagrams</h3>
        {onCreateNew && (
          <Button size="sm" onClick={onCreateNew} variant="secondary" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1.5" />
            New
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : diagrams.length === 0 ? (
        <div className="text-center py-12 border border-white/5 bg-white/5 rounded-lg border-dashed">
          <p className="text-muted-foreground text-sm mb-2">No diagrams yet.</p>
          {onCreateNew && (
            <Button variant="link" size="sm" onClick={onCreateNew} className="text-primary">Create one now</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {diagrams.map(diagram => {
              const isExpanded = expandedIds.has(diagram.id);
              return (
                <motion.div
                  layout
                  key={diagram.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Card
                    className={`bg-black/20 border-white/5 hover:border-primary/40 transition-colors cursor-pointer group shadow-none overflow-hidden ${isExpanded ? 'ring-1 ring-primary/50 bg-black/40' : ''}`}
                    onClick={() => toggleExpand(diagram.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate pr-2">{diagram.title}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{diagram.diagramType}</p>
                        </div>
                        <div className="flex gap-1 -mt-1 -mr-1 z-20">
                          {onInsert && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInsert(diagram);
                              }}
                              title="Insert into Chapter"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-950/30"
                            onClick={(e) => handleDelete(diagram.id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {!isExpanded ? (
                          <motion.div
                            key="collapsed"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "8rem" }} // h-32 = 8rem
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pointer-events-none relative rounded bg-black/40 border border-white/5"
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent z-10" />
                            <DiagramPreview
                              code={diagram.mermaidCode}
                              theme="dark"
                              className="border-0 scale-[0.5] origin-top-left w-[200%] h-[200%] bg-transparent"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            layout
                            key="expanded"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          >
                            <div className="min-h-[300px] rounded-md bg-black/40 border border-white/10 p-2 overflow-auto custom-scrollbar">
                              <DiagramPreview
                                code={diagram.mermaidCode}
                                theme="dark"
                                className="bg-transparent"
                              />
                            </div>
                            {diagram.description && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="mt-3 text-xs text-muted-foreground bg-white/5 p-2 rounded"
                              >
                                <span className="font-semibold text-primary/80 uppercase text-[10px] mr-2">Explanation</span>
                                {diagram.description}
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
