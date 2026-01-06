import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Authenticate user
        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch project and verify ownership
        const project = await prisma.project.findUnique({
            where: { id },
            include: { outline: true }
        });

        if (!project) {
            return new Response(JSON.stringify({ error: 'Project not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (project.userId !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Return stored outline
        const outline = project.outline?.content ? JSON.parse(project.outline.content) : null;

        return new Response(JSON.stringify({
            success: true,
            outline: outline
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[GetOutline] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch outline' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const body = await req.json();
        const { outline } = body;

        if (!outline) {
            return new Response(JSON.stringify({ error: 'Outline data is required' }), { status: 400 });
        }

        // Verify ownership
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project || project.userId !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        // Save or update outline
        // We store it as a JSON string in the 'content' field of ChapterOutline model
        // First check if an outline record exists
        const existingOutline = await prisma.chapterOutline.findUnique({
            where: { projectId: id }
        });

        if (existingOutline) {
            await prisma.chapterOutline.update({
                where: { projectId: id },
                data: { content: JSON.stringify(outline) }
            });
        } else {
            await prisma.chapterOutline.create({
                data: {
                    projectId: id,
                    content: JSON.stringify(outline)
                }
            });
        }

        // Touch project updatedAt to keep it at top of dashboard
        // Also RE-LOCK the project if this is a paid project that was unlocked for topic switch
        // This ensures once the new topic is confirmed, it's locked again
        const shouldRelock = project.isUnlocked && !project.isLocked;

        await prisma.project.update({
            where: { id },
            data: {
                updatedAt: new Date(),
                // Re-lock paid projects after topic switch is complete
                ...(shouldRelock && {
                    isLocked: true,
                    lockedAt: new Date()
                })
            }
        });

        if (shouldRelock) {
            console.log(`[SaveOutline] Re-locked project ${id} after topic switch completion`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('[SaveOutline] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to save outline' }), { status: 500 });
    }
}