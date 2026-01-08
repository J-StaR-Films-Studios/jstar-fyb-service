import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; threadId: string }> }
) {
    try {
        const { id: projectId, threadId } = await params;

        // 1. Delete all messages first (manual cascade)
        await prisma.projectChatMessage.deleteMany({
            where: { conversationId: threadId }
        });

        // 2. Delete the conversation
        await prisma.projectConversation.delete({
            where: {
                id: threadId,
                projectId // Security check: ensure it belongs to this project
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Failed to delete thread:", error);
        return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
}
