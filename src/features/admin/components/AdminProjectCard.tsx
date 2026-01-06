
import { Project } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Lock, Unlock, MoreHorizontal, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminProjectCardProps {
    project: Pick<Project, "id" | "topic" | "status" | "isLocked" | "createdAt" | "userId"> & {
        user?: { name: string | null; email: string } | null;
    };
    onAction?: (action: string) => void;
}

export function AdminProjectCard({ project, onAction }: AdminProjectCardProps) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-bold text-white line-clamp-2 text-sm">{project.topic}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            project.isLocked ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                        )}>
                            {project.isLocked ? "Locked" : "Unlocked"}
                        </span>
                        <span className="text-[10px] text-gray-500">•</span>
                        <span className="text-[10px] text-gray-500">{project.status}</span>
                    </div>
                </div>
                {onAction && (
                    <button className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {project.user?.name?.[0] || project.user?.email?.[0] || "?"}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-300">{project.user?.name || "Unknown"}</span>
                        <span className="text-[10px] text-gray-500">{project.user?.email}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(project.createdAt))} ago
                </div>
            </div>
        </div>
    );
}
