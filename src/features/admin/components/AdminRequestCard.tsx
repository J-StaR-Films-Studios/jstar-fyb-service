
import { TopicSwitchRequest } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Check, X, FileText, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequestRowActions } from "@/app/admin/requests/RequestRowActions"; // Reuse actions
import { ProofModal } from "./ProofModal";

interface AdminRequestCardProps {
    request: TopicSwitchRequest & {
        project?: { topic: string };
        user?: { name: string | null; email: string };
    };
}

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'pending':
            return "bg-yellow-500/10 text-yellow-500";
        case 'pending_payment':
            return "bg-blue-500/10 text-blue-500";
        case 'approved':
            return "bg-green-500/10 text-green-500";
        case 'denied':
            return "bg-red-500/10 text-red-500";
        default:
            return "bg-gray-500/10 text-gray-500";
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending_payment':
            return 'Awaiting Payment';
        default:
            return status;
    }
};

export function AdminRequestCard({ request }: AdminRequestCardProps) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
            {/* Header: User & Status */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">{request.user?.name || "Unknown User"}</div>
                        <div className="text-xs text-gray-500">{request.user?.email}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Fee Badge */}
                    {request.fee && request.fee > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            ₦{request.fee.toLocaleString()}
                        </span>
                    )}
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        getStatusStyles(request.status)
                    )}>
                        {getStatusLabel(request.status)}
                    </span>
                </div>
            </div>

            {/* Request Details */}
            <div className="bg-black/20 rounded-lg p-3 space-y-2">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Current Topic</span>
                    <span className="text-sm text-gray-300 line-clamp-1">{request.project?.topic}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Reason</span>
                    <span className="text-sm text-white">
                        {request.reason === 'changed_mind' ? 'Changed Mind' : 'Lecturer Rejected'}
                    </span>
                </div>
                {request.explanation && (
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Explanation</span>
                        <span className="text-sm text-gray-400 line-clamp-2">{request.explanation}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(request.createdAt))} ago
                    </span>
                    {request.proofUrl && <ProofModal proofUrl={request.proofUrl} />}
                </div>

                <div className="flex items-center gap-2">
                    {/* Only show review actions for pending requests */}
                    {request.status === 'pending' && (
                        <RequestRowActions requestId={request.id} currentStatus={request.status} />
                    )}
                    {request.status === 'pending_payment' && (
                        <span className="text-xs text-blue-400">Waiting for user payment</span>
                    )}
                </div>
            </div>
        </div>
    );
}
