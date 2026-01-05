
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id: projectId } = await params;
        const userId = user.id;

        // Verify project ownership
        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
                userId: userId,
            },
        });

        if (!project) {
            return new NextResponse("Project not found or unauthorized", { status: 404 });
        }

        // Check strict one-time limit
        if (project.topicSwitchCount >= 1) {
            return NextResponse.json(
                { error: "Topic switch limit reached. You can only change your topic once." },
                { status: 403 }
            );
        }

        // Reset project: clear abstract, outline, increment count
        // Note: We don't clear the TOPIC here because the user will enter a new one immediately after.
        // Actually, usually they enter a new topic in the UI, then we confirm.
        // But the current flow in TopicResetWarningModal just resets step to "TOPIC".
        // So we should just clear the generated artifacts (abstract, outline).

        // NOTE: The `topic` field will be overwritten when they submit the new topic form.

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                abstract: null,
                // Clear outline relation if simpler, or delete outline
                outline: {
                    delete: true
                },
                chapters: {
                    deleteMany: {}
                },
                status: "OUTLINE_GENERATED", // Reset status logic? Maybe 'TOPIC_SELECTED'? Schema has default 'OUTLINE_GENERATED'.
                // Actually reset to initial state might be better.

                topicSwitchCount: {
                    increment: 1
                },
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updatedProject);

    } catch (error) {
        console.error("[TOPIC_RESET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
