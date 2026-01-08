import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for progress updates
const ProgressUpdateSchema = z.object({
    milestone: z.enum([
        'OUTLINE_GENERATED',
        'RESEARCH_IN_PROGRESS',
        'RESEARCH_COMPLETE',
        'WRITING_IN_PROGRESS',
        'CHAPTER_WRITING_STARTED',
        'CHAPTER_WRITING_COMPLETED',
        'ABSTRACT_GENERATED',
        'PROJECT_COMPLETE'
    ]),
    phase: z.enum([
        'OUTLINE',
        'RESEARCH',
        'WRITING',
        'ABSTRACT',
        'REVIEW'
    ]),
    details: z.object({
        chapterId: z.string().optional(),
        chapterTitle: z.string().optional(),
        documentId: z.string().optional(),
        documentName: z.string().optional(),
        aiModel: z.string().optional(),
        tokensUsed: z.number().optional(),
        timeSpent: z.number().optional(), // in milliseconds
        notes: z.string().optional()
    }).optional(),
    metadata: z.record(z.string(), z.any()).optional()
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const session = await auth.api.getSession({
            headers: await request.headers,
        });

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate project access
        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
                OR: [
                    { userId: session.user.id },
                    { anonymousId: (session.user as any).anonymousId }
                ]
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await request.json();
        const validatedData = ProgressUpdateSchema.parse(body);

        // Get current progress data
        const currentProgress = project.contentProgress as any || {};
        const currentDocumentProgress = project.documentProgress as any || {};
        const currentAiStatus = project.aiGenerationStatus as any || {};
        const currentTimeTracking = project.timeTracking as any || {};
        const currentMilestones = project.milestones as any[] || [];

        // Update progress based on milestone
        const now = new Date();
        const milestoneEntry = {
            milestone: validatedData.milestone,
            phase: validatedData.phase,
            timestamp: now,
            details: validatedData.details,
            metadata: validatedData.metadata
        };

        // Update milestones array
        const updatedMilestones = [...currentMilestones, milestoneEntry];

        // Update phase-specific progress
        const updatedProgress = { ...currentProgress };
        const updatedDocumentProgress = { ...currentDocumentProgress };
        const updatedAiStatus = { ...currentAiStatus };
        const updatedTimeTracking = { ...currentTimeTracking };

        switch (validatedData.milestone) {
            case 'OUTLINE_GENERATED':
                updatedProgress.outline = { completed: true, timestamp: now };
                updatedAiStatus.outline = { status: 'completed', timestamp: now };
                break;

            case 'RESEARCH_IN_PROGRESS':
                updatedProgress.research = { status: 'in_progress', timestamp: now };
                break;

            case 'RESEARCH_COMPLETE':
                updatedProgress.research = { completed: true, timestamp: now };
                updatedDocumentProgress.status = 'completed';
                break;

            case 'WRITING_IN_PROGRESS':
                updatedProgress.writing = { status: 'in_progress', timestamp: now };
                break;

            case 'CHAPTER_WRITING_STARTED':
                if (validatedData.details?.chapterId) {
                    updatedProgress.chapters = {
                        ...updatedProgress.chapters,
                        [validatedData.details.chapterId]: {
                            status: 'in_progress',
                            startedAt: now,
                            title: validatedData.details.chapterTitle
                        }
                    };
                }
                break;

            case 'CHAPTER_WRITING_COMPLETED':
                if (validatedData.details?.chapterId) {
                    updatedProgress.chapters = {
                        ...updatedProgress.chapters,
                        [validatedData.details.chapterId]: {
                            ...updatedProgress.chapters?.[validatedData.details.chapterId],
                            completed: true,
                            completedAt: now,
                            timeSpent: validatedData.details.timeSpent
                        }
                    };
                }
                break;

            case 'ABSTRACT_GENERATED':
                updatedProgress.abstract = { completed: true, timestamp: now };
                updatedAiStatus.abstract = { status: 'completed', timestamp: now };
                break;

            case 'PROJECT_COMPLETE':
                updatedProgress.overall = { completed: true, timestamp: now };
                break;
        }

        // Update time tracking
        if (validatedData.phase && validatedData.details?.timeSpent) {
            updatedTimeTracking[validatedData.phase] = {
                ...updatedTimeTracking[validatedData.phase],
                totalTime: (updatedTimeTracking[validatedData.phase]?.totalTime || 0) + validatedData.details.timeSpent,
                lastUpdated: now
            };
        }

        // Calculate overall progress percentage
        const progressPercentage = calculateProgressPercentage(updatedProgress);

        // Update project
        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                progressPercentage,
                contentProgress: updatedProgress,
                documentProgress: updatedDocumentProgress,
                aiGenerationStatus: updatedAiStatus,
                timeTracking: updatedTimeTracking,
                milestones: updatedMilestones,
                estimatedCompletion: project.estimatedCompletion,
                actualCompletion: validatedData.milestone === 'PROJECT_COMPLETE' ? now : project.actualCompletion
            }
        });

        return NextResponse.json({
            success: true,
            project: {
                id: updatedProject.id,
                progressPercentage: updatedProject.progressPercentage,
                contentProgress: updatedProject.contentProgress,
                milestones: updatedProject.milestones
            }
        });

    } catch (error) {
        console.error('Progress update error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const session = await auth.api.getSession({
            headers: await request.headers,
        });

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate project access
        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
                OR: [
                    { userId: session.user.id },
                    { anonymousId: (session.user as any).anonymousId }
                ]
            },
            select: {
                id: true,
                progressPercentage: true,
                contentProgress: true,
                documentProgress: true,
                aiGenerationStatus: true,
                timeTracking: true,
                milestones: true,
                estimatedCompletion: true,
                actualCompletion: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            project
        });

    } catch (error) {
        console.error('Progress retrieval error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Helper function to calculate overall progress percentage
function calculateProgressPercentage(progress: any): number {
    const phases = ['outline', 'research', 'writing', 'abstract'];
    let completedPhases = 0;

    phases.forEach(phase => {
        if (progress[phase]?.completed) {
            completedPhases++;
        }
    });

    // Check if chapters are completed
    if (progress.chapters) {
        const chapterEntries = Object.entries(progress.chapters);
        if (chapterEntries.length > 0) {
            const completedChapters = chapterEntries.filter(([_, chapter]: [string, any]) => chapter.completed).length;
            const chapterProgress = (completedChapters / chapterEntries.length) * 0.4; // Chapters weight 40%
            return Math.round((completedPhases / phases.length) * 60 + chapterProgress * 100);
        }
    }

    return Math.round((completedPhases / phases.length) * 100);
}