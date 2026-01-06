/**
 * Builder AI Service - Facade Layer
 * 
 * This is the main entry point for AI-powered project building features.
 * The implementation has been refactored into focused modules:
 * 
 * - types.ts           - Shared TypeScript interfaces
 * - dataExtractors.ts  - DB queries and pattern extraction
 * - contextBuilders.ts - Context object factories  
 * - contentGenerators.ts - Templates and content generation
 * 
 * BACKUP: builderAiService.backup.ts (original 1261-line file)
 */

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// Re-export types for external consumers
export type {
    TopicGenerationResult,
    ContentGenerationResult
} from './types';

// Import from modules
import {
    findSimilarProjects,
    extractTopicPatterns,
    extractTwistPatterns
} from './dataExtractors';

import {
    buildProjectContext,
    buildOutlineContext,
    buildEnhancedChapterContext
} from './contextBuilders';

import {
    generateKeywordBasedTopics,
    generateTopicsFromHistory,
    generateAbstractWithContext,
    generateOutlineWithContext,
    generateResearchEnhancedContent
} from './contentGenerators';

// ======================================
// Main Service Class (Public API)
// ======================================

export class BuilderAiService {
    /**
     * Generate project topics based on keyword and historical project data
     */
    static async generateTopics(keyword: string): Promise<string[]> {
        try {
            // Get user for context
            const user = await getCurrentUser();

            // Find similar projects in the database
            const similarProjects = await findSimilarProjects(keyword, user?.id);

            if (similarProjects.length > 0) {
                // Generate topics based on historical data
                const existingTopics = similarProjects.map(p => p.topic);
                const existingTwists = similarProjects.map(p => p.twist);

                return generateTopicsFromHistory(
                    keyword,
                    existingTopics,
                    existingTwists,
                    extractTopicPatterns,
                    extractTwistPatterns
                );
            } else {
                // Fall back to keyword-based generation
                return generateKeywordBasedTopics(keyword);
            }
        } catch (error) {
            console.error('[BuilderAiService] Error generating topics:', error);
            // Fallback to simple keyword-based topics
            return [
                `AI-Based ${keyword} Analysis System`,
                `Smart ${keyword} Monitoring Platform`,
                `Automated ${keyword} Management Solution`
            ];
        }
    }

    /**
     * Generate abstract based on topic and project context
     */
    static async generateAbstract(topic: string): Promise<string> {
        try {
            // Get user for context
            const user = await getCurrentUser();

            // Find similar projects to understand context
            const similarProjects = await findSimilarProjects(topic, user?.id);

            // Build context from similar projects
            const context = buildProjectContext(similarProjects, topic);

            // Generate abstract with context
            return generateAbstractWithContext(topic, context);
        } catch (error) {
            console.error('[BuilderAiService] Error generating abstract:', error);
            // Fallback to simple abstract
            return `This project titled "${topic}" aims to solve critical challenges in the domain by leveraging modern web technologies. The system utilizes a microservices architecture to ensure scalability and robustness. Key features include real-time data processing, an intuitive user interface, and secure authentication mechanisms. The expected outcome is a fully functional prototype that demonstrates the efficacy of the proposed solution in improving operational efficiency by 40%.`;
        }
    }

    /**
     * Generate chapter outline based on topic and project context
     */
    static async generateOutline(topic: string): Promise<string[]> {
        try {
            // Get user for context
            const user = await getCurrentUser();

            // Find similar projects to understand structure patterns
            const similarProjects = await findSimilarProjects(topic, user?.id);

            // Build outline context
            const outlineContext = buildOutlineContext(similarProjects, topic);

            // Generate outline with context
            return generateOutlineWithContext(topic, outlineContext);
        } catch (error) {
            console.error('[BuilderAiService] Error generating outline:', error);
            // Fallback to standard academic outline
            return [
                "1.1 Background of Study",
                "1.2 Problem Statement",
                "1.3 Aim and Objectives",
                "1.4 Significance of the Study",
                "1.5 Scope and Limitations",
                "1.6 Definition of Terms"
            ];
        }
    }

    /**
     * Generate chapter content with project-specific context
     */
    static async generateChapterContent(
        projectId: string,
        chapterNumber: number,
        chapterTitle: string
    ): Promise<string> {
        try {
            // Get project details for context
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    outline: true,
                    documents: {
                        where: { status: 'PROCESSED' },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!project) {
                throw new Error('Project not found');
            }

            // Build comprehensive context including research documents
            const context = buildEnhancedChapterContext(project, chapterNumber, chapterTitle);

            // Generate chapter content with research-backed insights
            const content = await generateResearchEnhancedContent(chapterNumber, chapterTitle, context);

            // NOTE: We intentionally do NOT save to ChapterOutline here.
            // ChapterOutline stores the 5-chapter STRUCTURE (titles + summaries).
            // The actual chapter CONTENT is saved to the Chapter table by /api/generate/chapter.

            return content;
        } catch (error) {
            console.error('[BuilderAiService] Error generating chapter content:', error);
            throw error;
        }
    }
}