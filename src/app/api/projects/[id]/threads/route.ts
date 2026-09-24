import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { canAccessWorkspace } from '@/lib/workspace-access';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!await canAccessWorkspace(projectId, user.id)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const threads = await prisma.projectConversation.findMany({
            where: {
                projectId,
                isArchived: false
            },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                threadTitle: true,
                threadType: true,
                updatedAt: true,
                _count: {
                    select: { messages: true }
                }
            }
        });

        return Response.json({ success: true, threads });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to fetch threads' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!await canAccessWorkspace(projectId, user.id)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { title, type, contextScope } = body;

    try {
        const thread = await prisma.projectConversation.create({
            data: {
                projectId,
                threadTitle: title || 'New Conversation',
                threadType: type || 'general',
                contextScope: contextScope || {},
            }
        });

        return Response.json({ success: true, thread });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to create thread' }, { status: 500 });
    }
}
