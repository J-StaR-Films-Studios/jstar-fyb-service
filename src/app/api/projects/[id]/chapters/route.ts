import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // 1. Authenticate user
        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch project and verify ownership
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                chapters: {
                    orderBy: { number: 'asc' },
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        content: true,
                        status: true,
                        wordCount: true,
                        version: true,
                        lastEditedAt: true
                    }
                }
            }
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

        // 3. Return chapters (legacy support handled by migration, assuming empty if none)
        // If we still need to support contentProgress migration on read, we could do it here
        // but it's cleaner to assume migration runs on DB level or separate script.

        return new Response(JSON.stringify({
            success: true,
            chapters: project.chapters,
            topic: project.topic,
            twist: project.twist
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[GetChapters] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch chapters' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}