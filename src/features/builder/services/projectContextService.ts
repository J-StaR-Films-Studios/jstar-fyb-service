import { prisma } from '@/lib/prisma';
import { Project, ResearchDocument, Chapter } from '@prisma/client';

export interface ProjectContext {
    topic: string;
    abstract: string | null;
    outline: string | null;
    // Specific chapters text
    chapters: {
        number: number;
        title: string;
        content: string;
        status: string;
    }[];
    // Research summaries
    researchSummaries: {
        title: string;
        author: string | null;
        year: string | null;
        summary: string | null;
    }[];
    // Progress metadata
    currentProgress: {
        completedChapters: number;
        totalChapters: number;
        nextRecommendedStep: string;
    };
}

export interface EditContext {
    chapterTitle: string;
    sectionTitle: string;
    currentContent: string;
    surroundingContext: string;
}

export const ProjectContextService = {

    /**
     * Build full project context for AI consumption based on scope
     */
    async buildContext(projectId: string, options?: {
        chapterNumbers?: number[];
        includeResearch?: boolean;
        maxTokens?: number; // Placeholder for future token management
    }): Promise<ProjectContext> {

        // Run queries in parallel
        const [project, allChaptersCount, completedChaptersCount] = await Promise.all([
            prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    topic: true,
                    abstract: true,
                    outlineGenerated: true, // Required for getNextStep
                    outline: { select: { content: true } },
                    chapters: {
                        orderBy: { number: 'asc' },
                        where: options?.chapterNumbers && options.chapterNumbers.length > 0
                            ? { number: { in: options.chapterNumbers } }
                            : undefined,
                        select: {
                            number: true,
                            title: true,
                            content: true,
                            status: true
                        }
                    },
                    documents: options?.includeResearch !== false
                        ? {
                            where: { status: 'PROCESSED' },
                            select: { title: true, author: true, year: true, summary: true }
                        }
                        : false
                }
            }),
            prisma.chapter.count({ where: { projectId } }),
            prisma.chapter.count({ where: { projectId, status: 'COMPLETE' } })
        ]);

        if (!project) throw new Error('Project not found');

        // Format chapters
        const chapters = project.chapters.map(c => ({
            number: c.number,
            title: c.title,
            content: c.content,
            status: c.status
        }));

        // Format research
        // @ts-ignore - Prisma types for conditional relations can be tricky, but we know usage matches logic
        const researchSummaries = project.documents ? project.documents.map((d: any) => ({
            title: d.title || 'Untitled',
            author: d.author ?? null,
            year: d.year ?? null,
            summary: d.summary ?? null
        })) : [];

        return {
            topic: project.topic,
            abstract: project.abstract,
            outline: project.outline?.content || null,
            chapters,
            researchSummaries,
            currentProgress: {
                completedChapters: completedChaptersCount,
                totalChapters: 5, // Default for academic projects
                nextRecommendedStep: this.getNextStep(project as unknown as Project, completedChaptersCount)
            }
        };
    },

    /**
     * Build context specifically for section editing
     */
    async buildEditContext(
        projectId: string,
        chapterNumber: number,
        sectionContentToFind: string
    ): Promise<EditContext | null> {
        const chapter = await prisma.chapter.findFirst({
            where: { projectId, number: chapterNumber }
        });

        if (!chapter) throw new Error('Chapter not found');

        // Simple exact match context for now
        // In future, we can use fuzzy matching or subsections JSON

        const content = chapter.content;
        const index = content.indexOf(sectionContentToFind);

        if (index === -1) {
            // Fallback: Return whole chapter context if specific section not found
            return {
                chapterTitle: chapter.title,
                sectionTitle: 'Full Chapter',
                currentContent: chapter.content,
                surroundingContext: 'Refer to the full chapter content provided.'
            };
        }

        // Get 500 chars before and after
        const prev = content.slice(Math.max(0, index - 500), index);
        const next = content.slice(index + sectionContentToFind.length, index + sectionContentToFind.length + 500);

        return {
            chapterTitle: chapter.title,
            sectionTitle: 'Selected Section', // We might infer this from headers later
            currentContent: sectionContentToFind,
            surroundingContext: `...${prev}\n\n[TARGET SECTION]\n\n${next}...`
        };
    },

    getNextStep(project: Partial<Project>, completedChapters: number): string {
        if (!project.abstract) return 'Generate abstract';
        if (!project.outlineGenerated) return 'Generate chapter outline';
        if (completedChapters < 5) return `Draft Chapter ${completedChapters + 1}`;
        return 'Review and export your project';
    }
};
