import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { z } from 'zod';

const patchSchema = z.object({
    content: z.string().optional(),
    sectionId: z.string().optional(),
    sectionContent: z.string().optional(),
});

// Helper to parse sections (reused - in real app should be shared utility)
function parseSections(markdown: string) {
    const sections: any[] = [];
    const lines = markdown.split('\n');
    let currentSection: { title: string; content: string } | null = null;
    let order = 0;

    for (const line of lines) {
        if (line.match(/^##\s+/)) {
            if (currentSection) {
                sections.push({ ...currentSection, order: order++ });
            }
            currentSection = {
                title: line.replace(/^##\s+/, '').trim(),
                content: ''
            };
        } else if (currentSection) {
            currentSection.content += line + '\n';
        }
    }
    if (currentSection) {
        sections.push({ ...currentSection, order: order++ });
    }
    return sections;
}

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
            }
        });

        if (!chapter) {
            return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404 });
        }

        // Verify ownership via project
        const project = await prisma.project.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (project?.userId !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        return new Response(JSON.stringify(chapter), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch chapter' }), { status: 500 });
    }
}

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

        const body = await req.json();
        const validation = patchSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
        }

        const { content, sectionTitle, sectionContent } = body as any; // simplified for now

        // Check ownership
        const project = await prisma.project.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (project?.userId !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        // Fetch current chapter for versioning check
        const currentChapter = await prisma.chapter.findUnique({
            where: { projectId_number: { projectId: id, number: num } }
        });

        if (!currentChapter) {
            return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404 });
        }

        // Update logic
        let updateData: any = {
            lastEditedAt: new Date()
        };

        if (content) {
            // Auto-versioning: Create snapshot if content changed significantly (>100 chars difference)
            const contentDiff = Math.abs(content.length - (currentChapter.content?.length || 0));
            const isSignificantChange = contentDiff > 100 ||
                (currentChapter.content && content !== currentChapter.content);

            if (isSignificantChange && currentChapter.content) {
                // Create version snapshot before updating
                const newVersionSnapshot = {
                    version: currentChapter.version,
                    content: currentChapter.content,
                    createdAt: new Date().toISOString()
                };

                const existingVersions = (currentChapter.previousVersions as any[]) || [];

                // Limit stored versions to last 10 to prevent bloat
                const updatedVersions = [...existingVersions, newVersionSnapshot].slice(-10);

                updateData.previousVersions = updatedVersions;
                updateData.version = currentChapter.version + 1;
            }

            updateData.content = content;
            updateData.wordCount = content.split(/\s+/).length;
            updateData.sections = parseSections(content);
            updateData.status = 'EDITING';
        }

        const updatedChapter = await prisma.chapter.update({
            where: {
                projectId_number: {
                    projectId: id,
                    number: num
                }
            },
            data: updateData
        });

        return new Response(JSON.stringify(updatedChapter), { status: 200 });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to update chapter' }), { status: 500 });
    }
}
