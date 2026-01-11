'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2, Save, X, Plus, Image as ImageIcon, Code, Upload } from 'lucide-react';
import { DiagramPreview } from './DiagramPreview';
import { toast } from 'sonner';

interface DiagramGeneratorProps {
  projectId: string;
  onSave: (diagram: any) => void;
  onCancel?: () => void;
  onInsert?: (diagram: any) => void;
  initialPrompt?: string;
}

const DIAGRAM_EXAMPLES: Record<string, string> = {
  flowchart: 'graph TD\n  A[Start] --> B{Is it working?}\n  B -->|Yes| C[Great!]\n  B -->|No| D[Debug]',
  sequence: 'sequenceDiagram\n  Alice->>John: Hello John, how are you?\n  John-->>Alice: Great!',
  class: 'classDiagram\n  class Animal{\n    +String name\n    +move()\n  }\n  class Dog{\n    +bark()\n  }\n  Animal <|-- Dog',
  state: 'stateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still',
  er: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains',
  gantt: 'gantt\n  title A Gantt Diagram\n  dateFormat  YYYY-MM-DD\n  section Section\n  A task           :a1, 2014-01-01, 30d',
  mindmap: 'mindmap\n  root((Mindmap))\n    Origins\n      Long history\n    Research\n      On going'
};

export function DiagramGenerator({ projectId, onSave, onCancel, onInsert, initialPrompt }: DiagramGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [diagramType, setDiagramType] = useState('flowchart');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState<'default' | 'neutral' | 'dark' | 'forest' | 'base'>('dark');

  // ... (rest of component)


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
          mermaidCode: `%%{init: {'theme':'${theme}'}}%%\n${generatedCode}`,
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

  /* New Handler for Image Upload */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image too large (max 10MB)');
      return;
    }

    setIsGenerating(true);
    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        try {
          const res = await fetch('/api/generate/diagram-from-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64,
              prompt: prompt || 'Convert this image to a mermaid diagram'
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Generation failed');
          }

          const data = await res.json();
          setGeneratedCode(data.mermaidCode);
          setExplanation(data.explanation);

          if (!title) setTitle(`Imported Diagram - ${new Date().toLocaleTimeString()}`);
          toast.success('Diagram generated from image!');
        } catch (err: any) {
          toast.error(err.message || 'Failed to process image');
        } finally {
          setIsGenerating(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');

  return (
    <Card className="w-full h-full border-0 bg-transparent shadow-none flex flex-col">
      <CardHeader className="px-0 pt-0 pb-4 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Diagram Generator</CardTitle>
            <CardDescription>Create diagrams with AI or write Mermaid code manually.</CardDescription>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Tabs Toggle */}
        <div className="flex p-1 bg-white/5 rounded-lg w-fit mt-4 border border-white/5">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'ai' ? 'bg-primary/20 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            AI Generator
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'manual' ? 'bg-primary/20 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Code className="w-3.5 h-3.5" />
            Manual / Image
          </button>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1 custom-scrollbar">

        {/* Controls Section - Conditional Render */}
        {activeTab === 'ai' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-400">Diagram Type</label>
                <Select value={diagramType} onValueChange={setDiagramType}>
                  <SelectTrigger className="w-full bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
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
                <label className="text-sm font-medium mb-1 block text-gray-400">Theme</label>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger className="w-full bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="default">Light</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-gray-400">Description</label>
              <Textarea
                placeholder="Describe the process, system, or relationship..."
                className="h-24 resize-none bg-black/20 border-white/10"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
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
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Manual Mode Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-400">Title</label>
                <input
                  className="flex h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Diagram"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-400">Theme</label>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger className="w-full bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="default">Light</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload Area */}
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleImageUpload}
                disabled={isGenerating}
              />
              <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                {isGenerating ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <span className="text-sm text-gray-400">Analyzing image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-8 w-8 text-gray-500 mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-gray-300">Upload Image to Convert</span>
                    <span className="text-xs text-gray-500 mt-1">Drop a screenshot or whiteboard sketch</span>
                  </div>
                )}
              </div>
            </div>

            {/* Code Editor */}
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-400 flex items-center justify-between">
                <span>Mermaid Code</span>
                <span className="text-xs text-gray-500">Editable</span>
              </label>
              <Textarea
                placeholder="Paste or write Mermaid code here..."
                className="h-48 resize-none bg-black/20 border-white/10 font-mono text-xs leading-relaxed"
                value={generatedCode}
                onChange={(e) => setGeneratedCode(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Preview Section - Stacked below now */}
        <div className="space-y-4 pb-4">
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <label className="text-sm font-medium text-gray-400">Preview</label>
            <div className="flex gap-2">
              {onInsert && (
                <Button
                  size="sm"
                  onClick={() => generatedCode && onInsert({ mermaidCode: `%%{init: {'theme':'${theme}'}}%%\n${generatedCode}`, title })}
                  disabled={!generatedCode}
                  variant="outline"
                  className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Insert
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!generatedCode}
                variant="secondary"
                className="h-7 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="mr-2 h-3 w-3" />
                Save
              </Button>
            </div>
          </div>

          <div className="relative">
            {!generatedCode && activeTab === 'ai' && (
              <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-black/60 rounded text-[10px] text-white/50 border border-white/5 pointer-events-none">
                Example Preview
              </div>
            )}
            <DiagramPreview
              code={generatedCode || (activeTab === 'ai' ? DIAGRAM_EXAMPLES[diagramType] : '')}
              theme={theme}
              className="bg-black/20 min-h-[200px]"
            />
          </div>

          {activeTab === 'ai' && explanation && (
            <div className="text-sm text-muted-foreground bg-white/5 p-3 rounded-md">
              <p className="font-medium mb-1 text-xs uppercase tracking-wider text-primary">AI Explanation</p>
              <p className="text-xs leading-relaxed">{explanation}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
