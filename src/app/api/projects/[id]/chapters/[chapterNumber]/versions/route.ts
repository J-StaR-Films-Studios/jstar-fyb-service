import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
    try {
        const { id, chapterNumber } = await params;
        const num = parseInt(chapterNumber);

        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const chapter = await prisma.chapter.findUnique({
            where: {
                projectId_number: {
                    projectId: id,
                    number: num
                }
            },
            select: {
                previousVersions: true
            }
        });

        if (!chapter) {
            return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({ versions: chapter.previousVersions || [] }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch versions' }), { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
    try {
        const { id, chapterNumber } = await params;
        const num = parseInt(chapterNumber);

        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // Get current chapter state
        const chapter = await prisma.chapter.findUnique({
            where: {
                projectId_number: {
                    projectId: id,
                    number: num
                }
            }
        });

        if (!chapter) {
            return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404 });
        }

        // Create new snapshot
        const newVersion = {
            version: chapter.version,
            content: chapter.content,
            createdAt: new Date()
        };

        const existingVersions = (chapter.previousVersions as any[]) || [];

        // Save snapshot and increment version
        await prisma.chapter.update({
            where: { id: chapter.id },
            data: {
                version: { increment: 1 },
                previousVersions: [...existingVersions, newVersion]
            }
        });

        return new Response(JSON.stringify({ success: true, version: chapter.version + 1 }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to create version' }), { status: 500 });
    }
}

// PATCH: Restore a previous version
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; chapterNumber: string }> }
) {
    try {
        const { id, chapterNumber } = await params;
        const num = parseInt(chapterNumber);

        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { content } = await req.json();
        if (!content) {
            return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400 });
        }

        // Get current chapter state
        const chapter = await prisma.chapter.findUnique({
            where: {
                projectId_number: {
                    projectId: id,
                    number: num
                }
            }
        });

        if (!chapter) {
            return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404 });
        }

        // Save current content as a version before restoring
        const snapshotVersion = {
            version: chapter.version,
            content: chapter.content,
            createdAt: new Date()
        };

        const existingVersions = (chapter.previousVersions as any[]) || [];

        // Restore the content and increment version
        const wordCount = content.trim().split(/\s+/).length;

        await prisma.chapter.update({
            where: { id: chapter.id },
            data: {
                content,
                wordCount,
                version: { increment: 1 },
                previousVersions: [...existingVersions, snapshotVersion],
                lastEditedAt: new Date()
            }
        });

        return new Response(JSON.stringify({
            success: true,
            version: chapter.version + 1,
            message: 'Version restored successfully'
        }), { status: 200 });

    } catch (error) {
        console.error('[Versions PATCH] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to restore version' }), { status: 500 });
    }
}
