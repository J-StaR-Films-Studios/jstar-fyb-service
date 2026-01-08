import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

interface ProgressUpdate {
    projectId: string;
    milestone: string;
    phase: string;
    details?: any;
    metadata?: any;
}

interface ProgressData {
    progressPercentage: number;
    contentProgress: any;
    documentProgress: any;
    aiGenerationStatus: any;
    timeTracking: any;
    milestones: any[];
    estimatedCompletion: Date | null;
    actualCompletion: Date | null;
}

export class ProgressTrackingService {
    /**
     * Update project progress with milestone completion
     */
    static async updateProgress({
        projectId,
        milestone,
        phase,
        details,
        metadata
    }: ProgressUpdate): Promise<ProgressData | null> {
        try {
            const session = await getCurrentUser();
            if (!session) {
                throw new Error('Unauthorized');
            }

            // Validate project access
            const project = await prisma.project.findUnique({
                where: {
                    id: projectId,
                    OR: [
                        { userId: (session as any).id },
                        { anonymousId: (session as any).anonymousId }
                    ]
                }
            });

            if (!project) {
                throw new Error('Project not found');
            }

            // Get current progress data
            const currentProgress = project.contentProgress as any || {};
            const currentDocumentProgress = project.documentProgress as any || {};
            const currentAiStatus = project.aiGenerationStatus as any || {};
            const currentTimeTracking = project.timeTracking as any || {};
            const currentMilestones = project.milestones as any[] || [];

            // Update progress based on milestone
            const now = new Date();
            const milestoneEntry = {
                milestone,
                phase,
                timestamp: now,
                details,
                metadata
            };

            // Update milestones array
            const updatedMilestones = [...currentMilestones, milestoneEntry];

            // Update phase-specific progress
            const updatedProgress = { ...currentProgress };
            const updatedDocumentProgress = { ...currentDocumentProgress };
            const updatedAiStatus = { ...currentAiStatus };
            const updatedTimeTracking = { ...currentTimeTracking };

            switch (milestone) {
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
                    if (details?.chapterId) {
                        updatedProgress.chapters = {
                            ...updatedProgress.chapters,
                            [details.chapterId]: {
                                status: 'in_progress',
                                startedAt: now,
                                title: details.chapterTitle
                            }
                        };
                    }
                    break;

                case 'CHAPTER_WRITING_COMPLETED':
                    if (details?.chapterId) {
                        updatedProgress.chapters = {
                            ...updatedProgress.chapters,
                            [details.chapterId]: {
                                ...updatedProgress.chapters?.[details.chapterId],
                                completed: true,
                                completedAt: now,
                                timeSpent: details.timeSpent
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
            if (phase && details?.timeSpent) {
                updatedTimeTracking[phase] = {
                    ...updatedTimeTracking[phase],
                    totalTime: (updatedTimeTracking[phase]?.totalTime || 0) + details.timeSpent,
                    lastUpdated: now
                };
            }

            // Calculate overall progress percentage
            const progressPercentage = this.calculateProgressPercentage(updatedProgress);

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
                    actualCompletion: milestone === 'PROJECT_COMPLETE' ? now : project.actualCompletion
                }
            });

            return {
                progressPercentage: updatedProject.progressPercentage,
                contentProgress: updatedProject.contentProgress,
                documentProgress: updatedProject.documentProgress,
                aiGenerationStatus: updatedProject.aiGenerationStatus,
                timeTracking: updatedProject.timeTracking,
                milestones: (updatedProject.milestones as any[]) || [],
                estimatedCompletion: updatedProject.estimatedCompletion,
                actualCompletion: updatedProject.actualCompletion
            };

        } catch (error) {
            console.error('Progress update error:', error);
            throw error;
        }
    }

    /**
     * Get project progress data
     */
    static async getProgress(projectId: string): Promise<ProgressData | null> {
        try {
            const session = await getCurrentUser();
            if (!session) {
                throw new Error('Unauthorized');
            }

            const project = await prisma.project.findUnique({
                where: {
                    id: projectId,
                    OR: [
                        { userId: (session as any).id },
                        { anonymousId: (session as any).anonymousId }
                    ]
                },
                select: {
                    progressPercentage: true,
                    contentProgress: true,
                    documentProgress: true,
                    aiGenerationStatus: true,
                    timeTracking: true,
                    milestones: true,
                    estimatedCompletion: true,
                    actualCompletion: true
                }
            });

            if (!project) {
                return null;
            }

            return {
                progressPercentage: project.progressPercentage,
                contentProgress: project.contentProgress,
                documentProgress: project.documentProgress,
                aiGenerationStatus: project.aiGenerationStatus,
                timeTracking: project.timeTracking,
                milestones: (project.milestones as any[]) || [],
                estimatedCompletion: project.estimatedCompletion,
                actualCompletion: project.actualCompletion
            };

        } catch (error) {
            console.error('Progress retrieval error:', error);
            throw error;
        }
    }

    /**
     * Calculate overall progress percentage
     */
    private static calculateProgressPercentage(progress: any): number {
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

    /**
     * Get project analytics for admin dashboard
     */
    static async getProjectAnalytics(): Promise<any> {
        try {
            const projects = await prisma.project.findMany({
                select: {
                    id: true,
                    topic: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    outlineGenerated: true,
                    isUnlocked: true,
                    progressPercentage: true
                }
            });

            // Calculate basic analytics
            const totalProjects = projects.length;
            const completedProjects = projects.filter(p => p.status === 'PROJECT_COMPLETE').length;
            const inProgressProjects = projects.filter(p =>
                p.status === 'WRITING_IN_PROGRESS' ||
                p.status === 'RESEARCH_IN_PROGRESS' ||
                p.status === 'RESEARCH_COMPLETE'
            ).length;
            const outlineGenerated = projects.filter(p => p.outlineGenerated).length;
            const paidProjects = projects.filter(p => p.isUnlocked).length;

            // Calculate average project duration
            const avgDuration = projects.length > 0
                ? projects.reduce((acc, project) => {
                    const duration = project.updatedAt.getTime() - project.createdAt.getTime();
                    return acc + duration;
                }, 0) / projects.length
                : 0;

            return {
                totalProjects,
                completedProjects,
                inProgressProjects,
                outlineGenerated,
                paidProjects,
                completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
                avgProjectDuration: Math.round(avgDuration / (1000 * 60 * 60 * 24)), // in days
                projects
            };

        } catch (error) {
            console.error('Analytics error:', error);
            throw error;
        }
    }
}