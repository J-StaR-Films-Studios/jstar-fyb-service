/**
 * Shared types for Builder AI Service modules
 * Extracted from builderAiService.ts refactor
 */

// ======================================
// Public Result Types
// ======================================

export interface TopicGenerationResult {
    topics: string[];
    confidence: number;
    reasoning: string[];
}

export interface ContentGenerationResult {
    content: string;
    quality: 'basic' | 'standard' | 'premium';
    estimatedWords: number;
}

// ======================================
// Context Types
// ======================================

export interface ProjectContext {
    domain: string;
    technologies: string[];
    features: string[];
    focusAreas: string[];
    improvements: string;
    contribution: string;
    futureScope: string;
}

export interface OutlineContext {
    domain: string;
    technologies: string[];
    problemDomain: string;
}

export interface ChapterContext {
    projectTopic: string;
    problemDomain: string;
    technologies: string[];
    objectives: string[];
    scope: string;
    chapterNumber: number;
    chapterTitle: string;
}

export interface ResearchContext {
    documents: {
        id: string;
        title: string;
        content: string;
        summary: string | null;
    }[];
    summaries: string[];
    summary: string;
    insights: string[];
    keywords: string[];
    themes: string[];
    extractedContent: string;
}

export interface EnhancedChapterContext extends ChapterContext {
    researchContext: ResearchContext;
    hasResearchDocuments: boolean;
    // Template defaults
    limitations: string[];
    problem1: string;
    problem2: string;
    problem3: string;
    consequences: string;
    objectiveDetails: string;
    primaryTechnology: string;
    domain: string;
    technicalAspect: string;
    useCase: string;
    industryApplication: string;
    futureResearchAreas: string;
    projectScope: string;
    scopeDetails: string;
    limitation1: string;
    limitation2: string;
    limitation3: string;
    term1: string;
    term1Definition: string;
    term2: string;
    term2Definition: string;
    term3: string;
    term3Definition: string;
    // Additional template properties are spread from buildEnhancedChapterContext
    [key: string]: unknown;
}

// ======================================
// Database Types (simplified for service layer)
// ======================================

export interface SimilarProject {
    id: string;
    topic: string;
    twist?: string | null;
    abstract?: string | null;
    userId?: string | null;
    anonymousId?: string | null;
    updatedAt: Date;
}

export interface ProcessedDocument {
    id: string;
    fileName?: string;
    summary?: string | null;
    insights?: string | null;
    keywords?: string | null;
    themes?: string | null;
    extractedContent?: string | null;
    status: string;
}

export interface ProjectWithDocuments {
    id: string;
    topic: string;
    twist?: string | null;
    abstract?: string | null;
    outline?: { content: string } | null;
    documents: ProcessedDocument[];
}
