import React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStepProps {
    label: string;
    subLabel?: string;
    status: "completed" | "current" | "pending";
    stepNumber?: number;
}

const TimelineStep = ({ label, subLabel, status, stepNumber }: TimelineStepProps) => {
    return (
        <div className="flex items-center gap-4">
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all",
                    status === "completed" && "bg-green-500/20 text-green-500 border-transparent",
                    status === "current" && "bg-primary/20 text-primary border-primary/50 animate-pulse",
                    status === "pending" && "bg-white/5 text-gray-500 border-white/10"
                )}
            >
                {status === "completed" ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <span className="text-xs font-bold">{stepNumber}</span>
                )}
            </div>
            <div className="flex-1">
                <p className={cn("text-sm font-bold", status === "pending" && "text-gray-500")}>{label}</p>
                {subLabel && <p className="text-xs text-accent">{subLabel}</p>}
            </div>
        </div>
    );
};

export const StatusTimeline = ({ status, progress, customLabel }: { status: string; progress: number; customLabel?: string }) => {
    /**
     * Prisma Project Status values:
     * - OUTLINE_GENERATED (default)
     * - RESEARCH_IN_PROGRESS
     * - RESEARCH_COMPLETE
     * - WRITING_IN_PROGRESS
     * - PROJECT_COMPLETE
     */

    // Map statuses to step states
    const getStepStatus = (step: "topic" | "payment" | "generation"): "completed" | "current" | "pending" => {
        // Topic is always completed if they have a project on dashboard
        if (step === "topic") return "completed";

        const inProgressStatuses = ["RESEARCH_IN_PROGRESS", "WRITING_IN_PROGRESS"];
        const completedStatuses = ["RESEARCH_COMPLETE", "PROJECT_COMPLETE"];
        const isProjectFullyUnlocked = completedStatuses.includes(status) || inProgressStatuses.includes(status) || status === "UNLOCKED";

        if (step === "payment") {
            // Check if project is unlocked/paid
            return isProjectFullyUnlocked ? "completed" : "current";
        }

        // Generation step logic
        if (completedStatuses.includes(status)) return "completed";
        if (inProgressStatuses.includes(status)) return "current";
        return "pending"; // OUTLINE_GENERATED or unknown
    };

    const getGenerationLabel = (): string => {
        if (customLabel) return customLabel; // Override with dynamic status like "Writing Chapter 3"

        switch (status) {
            case "RESEARCH_IN_PROGRESS": return "Researching...";
            case "WRITING_IN_PROGRESS": return "Writing Content...";
            case "RESEARCH_COMPLETE": return "Research Complete";
            case "PROJECT_COMPLETE": return "Generation Complete";
            default: return "Waiting to Start";
        }
    };

    const getGenerationSubLabel = (): string | undefined => {
        switch (status) {
            case "RESEARCH_IN_PROGRESS": return "AI is gathering sources...";
            case "WRITING_IN_PROGRESS": return "AI is writing chapters...";
            case "RESEARCH_COMPLETE":
            case "PROJECT_COMPLETE": return "Ready";
            default: return undefined;
        }
    };

    return (
        <div className="space-y-4 mb-8">
            <TimelineStep label="Topic Approved" subLabel="Checked" status={getStepStatus("topic")} />
            <TimelineStep
                label={status === 'UNLOCKED' || getStepStatus("payment") === "completed" ? "Payment Verified" : "Payment"}
                subLabel={status === 'UNLOCKED' || getStepStatus("payment") === "completed" ? "Paid" : "Pending"}
                status={getStepStatus("payment")}
                stepNumber={2}
            />
            <TimelineStep
                label={getGenerationLabel()}
                subLabel={getGenerationSubLabel()}
                status={getStepStatus("generation")}
                stepNumber={3}
            />
        </div>
    );
};
