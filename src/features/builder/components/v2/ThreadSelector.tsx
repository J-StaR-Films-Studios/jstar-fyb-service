import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ChevronDown,
    Plus,
    MessageSquare,
    BookOpen,
    Search,
    Clock,
    Check,
    Trash2,
    Sparkles
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Thread {
    id: string;
    threadTitle: string;
    threadType: string;
    updatedAt: string;
}

interface ThreadSelectorProps {
    projectId: string;
    activeThreadId: string | null;
    onThreadSelect: (threadId: string | null) => void;
    onCreateThread: (type: 'general' | 'chapter' | 'research', title?: string) => void;
}

export function ThreadSelector({
    projectId,
    activeThreadId,
    onThreadSelect,
    onCreateThread
}: ThreadSelectorProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadThreads();
    }, [projectId]);

    const loadThreads = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/threads`);
            const data = await res.json();
            if (data.success) {
                setThreads(data.threads);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const [isOpen, setIsOpen] = useState(false);
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

    const confirmDelete = async () => {
        if (!threadToDelete) return;

        try {
            const res = await fetch(`/api/projects/${projectId}/threads/${threadToDelete}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                if (activeThreadId === threadToDelete) {
                    onThreadSelect(null);
                }
                loadThreads();
            }
        } catch (e) {
            console.error("Failed to delete thread", e);
        } finally {
            setThreadToDelete(null);
        }
    };

    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-auto py-2 px-3 text-left hover:bg-white/5 data-[state=open]:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all"
                    >
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-[10px] font-medium text-primary flex items-center gap-1">
                                {activeThreadId ? (
                                    <>
                                        {activeThread?.threadType === 'general' ? <MessageSquare className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                                        {activeThread?.threadType === 'general' ? 'Chat' : 'Focused'}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3 h-3" />
                                        Copilot
                                    </>
                                )}
                                <ChevronDown className="w-3 h-3 opacity-50 ml-0.5" />
                            </span>
                            <span className="text-sm font-semibold text-white max-w-[200px] truncate leading-tight">
                                {activeThreadId ? (activeThread?.threadTitle || 'Untitled Thread') : 'Global Context'}
                            </span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[300px] bg-black/90 backdrop-blur-xl border-white/10 text-gray-200">
                    <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider font-bold px-3 py-2">
                        Active Session
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                        className={cn(
                            "px-3 py-3 cursor-pointer focus:bg-white/10",
                            !activeThreadId && "bg-primary/10 text-primary"
                        )}
                        onClick={() => {
                            onThreadSelect(null);
                            setIsOpen(false);
                        }}
                    >
                        <div className="flex items-start gap-3 w-full">
                            <div className="mt-1 w-2 h-2 rounded-full bg-primary/50" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Main Copilot Chat</span>
                                    {!activeThreadId && <Check className="w-3 h-3" />}
                                </div>
                                <p className="text-xs opacity-60 line-clamp-1 mt-0.5">
                                    Full project context access
                                </p>
                            </div>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider font-bold px-3 py-2 flex justify-between items-center">
                        <span>Recent Threads</span>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 hover:bg-white/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateThread('general');
                                setIsOpen(false);
                            }}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </DropdownMenuLabel>

                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {threads.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-gray-500 text-center italic">
                                No saved threads yet
                            </div>
                        ) : (
                            threads.map(thread => (
                                <DropdownMenuItem
                                    key={thread.id}
                                    className={cn(
                                        "px-3 py-3 cursor-pointer focus:bg-white/10 border-l-2 border-transparent group flex items-start gap-2",
                                        activeThreadId === thread.id && "bg-white/5 border-primary"
                                    )}
                                    // Make sure main click closes dropdown too? default behavior.
                                    onClick={() => onThreadSelect(thread.id)}
                                >
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm truncate max-w-[160px]">{thread.threadTitle}</span>
                                            {activeThreadId === thread.id && <Check className="w-3 h-3 text-primary" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <span className="flex items-center gap-1">
                                                {thread.threadType === 'chapter' ? <BookOpen className="w-3 h-3" /> :
                                                    thread.threadType === 'research' ? <Search className="w-3 h-3" /> :
                                                        <MessageSquare className="w-3 h-3" />}
                                                {thread.threadType}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsOpen(false);
                                            setThreadToDelete(thread.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>

                    <DropdownMenuSeparator className="bg-white/10" />

                    <div className="p-2">
                        <Button
                            size="sm"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-0 justify-start"
                            onClick={() => {
                                onCreateThread('general', 'New Discussion');
                                setIsOpen(false);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Discussion Thread
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Scoped Delete Confirmation Modal */}
            {threadToDelete && (
                typeof document !== 'undefined' ? createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setThreadToDelete(null)}
                    >
                        <div
                            className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-white mb-2">Delete Conversation?</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                This will permanently delete this thread and all its messages. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => setThreadToDelete(null)}
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDelete}
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                >
                                    Delete Thread
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                ) : null
            )}
        </>
    );
}
