/**
 * Data Extraction Functions for Builder AI Service
 * Handles DB queries and pattern extraction from projects
 * 
 * Extracted from builderAiService.ts refactor
 */

import { prisma } from '@/lib/prisma';
import type {
    SimilarProject,
    ProcessedDocument,
    ResearchContext
} from './types';

// ======================================
// Database Queries
// ======================================

/**
 * Find similar projects in the database based on keyword matching
 */
export async function findSimilarProjects(
    keyword: string,
    userId?: string
): Promise<SimilarProject[]> {
    try {
        const whereClause: {
            OR: { topic?: { contains: string; mode: 'insensitive' }; twist?: { contains: string; mode: 'insensitive' } }[];
            AND?: { OR: ({ userId: string } | { anonymousId: { not: null } })[] }[];
        } = {
            OR: [
                {
                    topic: {
                        contains: keyword,
                        mode: 'insensitive'
                    }
                },
                {
                    twist: {
                        contains: keyword,
                        mode: 'insensitive'
                    }
                }
            ]
        };

        // If user is provided, prioritize their projects
        if (userId) {
            whereClause.AND = [
                {
                    OR: [
                        { userId },
                        { anonymousId: { not: null } } // Include anonymous projects for broader context
                    ]
                }
            ];
        }

        const similarProjects = await prisma.project.findMany({
            where: whereClause,
            orderBy: {
                updatedAt: 'desc'
            },
            take: 10 // Get up to 10 similar projects
        });

        return similarProjects;
    } catch (error) {
        console.error('[DataExtractors] Error finding similar projects:', error);
        return [];
    }
}

// ======================================
// Topic Pattern Extraction
// ======================================

/**
 * Extract topic patterns from existing projects
 */
export function extractTopicPatterns(existingTopics: string[], keyword: string): string[] {
    const patterns: string[] = [];

    existingTopics.forEach(topic => {
        const words = topic.toLowerCase().split(/\s+/);
        words.forEach(word => {
            if (word.length > 3 && !keyword.toLowerCase().includes(word)) {
                patterns.push(word);
            }
        });
    });

    return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Extract twist patterns from existing projects
 */
export function extractTwistPatterns(existingTwists: (string | null | undefined)[]): string[] {
    const patterns: string[] = [];

    existingTwists.forEach(twist => {
        if (twist) {
            const words = twist.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) {
                    patterns.push(word);
                }
            });
        }
    });

    return [...new Set(patterns)]; // Remove duplicates
}

// ======================================
// Technology & Feature Extraction
// ======================================

/**
 * Extract technologies from similar projects
 */
export function extractTechnologies(similarProjects: SimilarProject[]): string[] {
    const techKeywords = [
        'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C#',
        'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'ASP.NET',
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes'
    ];

    const foundTech: string[] = [];

    similarProjects.forEach(project => {
        const text = ((project.topic || '') + ' ' + (project.twist || '') + ' ' + (project.abstract || '')).toLowerCase();
        techKeywords.forEach(tech => {
            if (text.includes(tech.toLowerCase()) && !foundTech.includes(tech)) {
                foundTech.push(tech);
            }
        });
    });

    return foundTech.slice(0, 5); // Limit to 5 technologies
}

/**
 * Extract features from similar projects
 */
export function extractFeatures(similarProjects: SimilarProject[]): string[] {
    const featureKeywords = [
        'real-time processing', 'user authentication', 'data visualization',
        'machine learning', 'API integration', 'responsive design',
        'database management', 'security features', 'performance optimization'
    ];

    const foundFeatures: string[] = [];

    similarProjects.forEach(project => {
        const text = ((project.topic || '') + ' ' + (project.twist || '') + ' ' + (project.abstract || '')).toLowerCase();
        featureKeywords.forEach(feature => {
            if (text.includes(feature) && !foundFeatures.includes(feature)) {
                foundFeatures.push(feature);
            }
        });
    });

    return foundFeatures.slice(0, 5); // Limit to 5 features
}

/**
 * Extract focus areas from similar projects
 */
export function extractFocusAreas(_similarProjects: SimilarProject[]): string[] {
    return ['user experience', 'system performance', 'data security', 'scalability'];
}

/**
 * Extract improvements from similar projects
 */
export function extractImprovements(_similarProjects: SimilarProject[]): string {
    return 'operational efficiency and user satisfaction';
}

/**
 * Extract contribution from similar projects
 */
export function extractContribution(_similarProjects: SimilarProject[]): string {
    return 'providing a practical implementation of modern software engineering principles';
}

/**
 * Extract future scope from similar projects
 */
export function extractFutureScope(_similarProjects: SimilarProject[]): string {
    return 'related application domains';
}

// ======================================
// Domain & Context Detection
// ======================================

/**
 * Detect domain from topic
 */
export function detectDomain(topic: string): string {
    const lowerTopic = topic.toLowerCase();

    if (lowerTopic.includes('health') || lowerTopic.includes('medical')) return 'healthcare';
    if (lowerTopic.includes('education') || lowerTopic.includes('learning')) return 'education';
    if (lowerTopic.includes('finance') || lowerTopic.includes('banking')) return 'finance';
    if (lowerTopic.includes('e-commerce') || lowerTopic.includes('shop')) return 'e-commerce';
    if (lowerTopic.includes('social') || lowerTopic.includes('network')) return 'social media';

    return 'technology';
}

/**
 * Extract problem domain from topic
 */
export function extractProblemDomain(topic: string): string {
    return topic;
}

/**
 * Extract technologies from a single project
 */
export function extractProjectTechnologies(_project: { topic: string; twist?: string | null }): string[] {
    // This would be enhanced based on actual project data
    return ['Modern Web Technologies', 'Database Systems', 'API Development'];
}

/**
 * Extract project objectives
 */
export function extractProjectObjectives(_project: { topic: string }): string[] {
    return [
        'Analyze requirements and constraints',
        'Design system architecture',
        'Implement core functionality',
        'Evaluate system performance'
    ];
}

// ======================================
// Research Document Extraction
// ======================================

/**
 * Extract research context from processed documents
 */
export function extractResearchContext(documents: ProcessedDocument[]): ResearchContext {
    if (!documents || documents.length === 0) {
        return {
            documents: [],
            summaries: [],
            summary: '',
            insights: [],
            keywords: [],
            themes: [],
            extractedContent: ''
        };
    }

    // Aggregate insights from all processed documents
    const summaries = documents.map(doc => doc.summary || '').filter(Boolean);
    const allInsights = documents.flatMap(doc => {
        try {
            return doc.insights ? JSON.parse(doc.insights) : [];
        } catch {
            return [];
        }
    });
    const allKeywords = documents.flatMap(doc => {
        try {
            return doc.keywords ? JSON.parse(doc.keywords) : [];
        } catch {
            return [];
        }
    });
    const allThemes = documents.flatMap(doc => {
        try {
            return doc.themes ? JSON.parse(doc.themes) : [];
        } catch {
            return [];
        }
    });
    const extractedContent = documents.map(doc => doc.extractedContent || '').join('\n\n');

    return {
        documents: documents.map(doc => ({
            id: doc.id || '',
            title: doc.fileName || 'Untitled',
            content: doc.extractedContent || '',
            summary: doc.summary || null
        })),
        summary: summaries.join('\n\n'), // Legacy field, kept for compatibility if needed
        summaries, // New field for structured injection
        insights: [...new Set(allInsights)],
        keywords: [...new Set(allKeywords)],
        themes: [...new Set(allThemes)],
        extractedContent: extractedContent
    };
}
