import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { canAccessWorkspace } from '@/lib/workspace-access';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; threadId: string }> }
) {
    try {
        const { id: projectId, threadId } = await params;
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!await canAccessWorkspace(projectId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const thread = await prisma.projectConversation.findFirst({
            where: { id: threadId, projectId },
            select: { id: true }
        });
        if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

        await prisma.$transaction([
            prisma.projectChatMessage.deleteMany({ where: { conversationId: thread.id } }),
            prisma.projectConversation.delete({ where: { id: thread.id, projectId } })
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Failed to delete thread:", error);
        return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
}
