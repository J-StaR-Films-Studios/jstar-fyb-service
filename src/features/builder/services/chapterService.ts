
import { prisma } from '@/lib/prisma';
import { Chapter } from '@prisma/client';
import { generateObject } from 'ai';
import { z } from 'zod';

// We need to access the configured model, for now we can import selectModel or use a default
import { selectModel } from '@/lib/ai';
import { UNIVERSAL_ACADEMIC_RULES } from '@/features/bot/prompts/universalRules';

export const ChapterService = {
    /**
     * List all chapters for a project (summary view)
     */
    async getChapters(projectId: string) {
        return await prisma.chapter.findMany({
            where: { projectId },
            orderBy: { number: 'asc' },
            select: {
                id: true,
                number: true,
                title: true,
                status: true,
                updatedAt: true
            }
        });
    },

    /**
     * Get a specific chapter with full content
     */
    async getChapter(projectId: string, chapterNumber: number) {
        return await prisma.chapter.findFirst({
            where: { projectId, number: chapterNumber }
        });
    },

    /**
     * Create a new chapter
     */
    async createChapter(projectId: string, data: { number: number; title: string; content?: string }) {
        // Check if chapter exists
        const existing = await prisma.chapter.findFirst({
            where: { projectId, number: data.number }
        });

        if (existing) {
            throw new Error(`Chapter ${data.number} already exists`);
        }

        return await prisma.chapter.create({
            data: {
                projectId,
                number: data.number,
                title: data.title,
                content: data.content || '',
                status: 'DRAFT'
            }
        });
    },

    /**
     * Update chapter content
     */
    async updateChapterContent(projectId: string, chapterNumber: number, content: string) {
        const chapter = await prisma.chapter.findFirst({
            where: { projectId, number: chapterNumber }
        });

        if (!chapter) throw new Error(`Chapter ${chapterNumber} not found`);

        return await prisma.chapter.update({
            where: { id: chapter.id },
            data: { content, updatedAt: new Date() }
        });
    },

    /**
     * Generate structured outline for a project
     * (Wraps AI generation logic but returns data, doesn't save to DB directly unless requested)
     */
    async generateOutline(projectId: string, context?: { topic: string; abstract?: string; focus?: string }) {
        // 1. Fetch project context if not provided
        if (!context) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { topic: true, abstract: true }
            });
            if (!project) throw new Error('Project not found');
            context = { topic: project.topic, abstract: project.abstract || '', focus: '' };
        }

        // 2. Generate Outline using AI
        const { model } = selectModel({ quality: 'high' });

        const prompt = `
        Create a detailed academic chapter outline for a project titled: "${context.topic}".
        Abstract: "${context.abstract}"
        ${context.focus ? `Focus areas: ${context.focus}` : ''}

        Return a comprehensive list of chapters (at least 5) with titles and brief descriptions.
        
        ## UNIVERSAL ACADEMIC GUIDELINES
        Pay close attention to the Structure & Content Guidelines (e.g. Chapter 1 Introduction, References chapter at the end).
        ${UNIVERSAL_ACADEMIC_RULES}
        `;

        const result = await generateObject({
            model,
            schema: z.object({
                chapters: z.array(z.object({
                    number: z.number(),
                    title: z.string(),
                    description: z.string()
                }))
            }),
            prompt
        });

        return result.object.chapters;
    }
};
