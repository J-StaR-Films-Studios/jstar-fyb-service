import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Check, X, Download, Plus, Layout } from 'lucide-react';
import { DiagramPreview } from './DiagramPreview';
import { toast } from 'sonner';

interface DiagramSuggestionCardProps {
    title: string;
    type: string;
    mermaidCode: string;
    explanation?: string;
    onInsert: () => void;
    onSave: () => void;
    onReject: () => void;
}

export function DiagramSuggestionCard({
    title,
    type,
    mermaidCode,
    explanation,
    onInsert,
    onSave,
    onReject
}: DiagramSuggestionCardProps) {
    const [isExplained, setIsExplained] = useState(false);

    return (
        <div className="w-full max-w-2xl my-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-black/40 border-primary/30 shadow-lg shadow-primary/5 overflow-hidden backdrop-blur-md">
                <CardHeader className="bg-white/5 border-b border-white/5 py-3 px-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] tracking-wider">
                            {type}
                        </Badge>
                        <CardTitle className="text-sm font-medium text-white/90 truncate max-w-[200px]" title={title}>
                            {title}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-white"
                            onClick={onReject}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0 bg-gray-900/50 relative min-h-[200px]">
                    <div className="absolute inset-0 z-0 opacity-50 pointer-events-none bg-grid-white/[0.02]" />
                    <div className="relative z-10 p-4">
                        <DiagramPreview
                            code={mermaidCode}
                            theme="dark"
                            className="w-full"
                        />
                    </div>
                </CardContent>

                {explanation && (
                    <div className="px-4 py-2 bg-white/5 border-t border-white/5 text-xs text-gray-300">
                        <p className="line-clamp-2">{explanation}</p>
                    </div>
                )}

                <CardFooter className="p-2 gap-2 bg-black/40 border-t border-white/5 grid grid-cols-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 hover:border-white/20 h-9"
                        onClick={onSave}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Save
                    </Button>
                    <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-9"
                        onClick={onInsert}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Insert
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
