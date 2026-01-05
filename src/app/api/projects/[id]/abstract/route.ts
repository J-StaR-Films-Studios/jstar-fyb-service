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
            where: { id }
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

        // Return stored abstract
        return new Response(JSON.stringify({
            success: true,
            abstract: project.abstract
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[GetAbstract] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch abstract' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { abstract } = await req.json();

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
            where: { id }
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

        // Update abstract
        const updatedProject = await prisma.project.update({
            where: { id },
            data: { abstract }
        });

        return new Response(JSON.stringify({
            success: true,
            abstract: updatedProject.abstract
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[UpdateAbstract] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update abstract' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}