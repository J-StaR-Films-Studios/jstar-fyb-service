'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2, Save, X } from 'lucide-react';
import { DiagramPreview } from './DiagramPreview';
import { toast } from 'sonner';

interface DiagramGeneratorProps {
  projectId: string;
  onSave: (diagram: any) => void;
  onCancel?: () => void;
  initialPrompt?: string;
}

export function DiagramGenerator({ projectId, onSave, onCancel, initialPrompt }: DiagramGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [diagramType, setDiagramType] = useState('flowchart');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [title, setTitle] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, diagramType, context }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      setGeneratedCode(data.mermaidCode);
      setExplanation(data.explanation);

      if (!title) {
        setTitle(`${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} - ${new Date().toLocaleTimeString()}`);
      }

    } catch (error) {
      toast.error('Failed to generate diagram');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedCode || !title) {
        toast.error('Please generate a diagram and provide a title first');
        return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/diagrams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          diagramType,
          mermaidCode: generatedCode,
          description: explanation
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const savedDiagram = await res.json();
      toast.success('Diagram saved!');
      onSave(savedDiagram);

    } catch (error) {
      toast.error('Failed to save diagram');
      console.error(error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-gray-800 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>AI Diagram Generator</CardTitle>
                <CardDescription>Describe your diagram and let AI build it.</CardDescription>
            </div>
            {onCancel && (
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Diagram Type</label>
              <Select value={diagramType} onValueChange={setDiagramType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flowchart">Flowchart</SelectItem>
                  <SelectItem value="sequence">Sequence Diagram</SelectItem>
                  <SelectItem value="class">Class Diagram</SelectItem>
                  <SelectItem value="state">State Diagram</SelectItem>
                  <SelectItem value="er">Entity Relationship</SelectItem>
                  <SelectItem value="gantt">Gantt Chart</SelectItem>
                  <SelectItem value="mindmap">Mindmap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                placeholder="Describe the process, system, or relationship you want to visualize..."
                className="h-32 resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title (Optional)</label>
              <input
                 className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="My Diagram"
              />
            </div>

            <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Diagram
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Preview</label>
                {generatedCode && (
                    <Button size="sm" onClick={handleSave} variant="secondary">
                        <Save className="mr-2 h-4 w-4" />
                        Save to Project
                    </Button>
                )}
            </div>

            <DiagramPreview
                code={generatedCode}
                theme="dark"
                className="bg-gray-950/50 min-h-[300px]"
            />

            {explanation && (
                <div className="text-sm text-muted-foreground bg-white/5 p-3 rounded-md">
                    <p className="font-medium mb-1 text-xs uppercase tracking-wider">AI Explanation</p>
                    {explanation}
                </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
