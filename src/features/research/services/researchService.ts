import { prisma } from '@/lib/prisma';
import { ReasoningService } from './reasoningService';
import { SemanticScholarService, SemanticScholarPaper } from './semanticScholarService';
import { GeminiService, GroundedWebSource } from './geminiService';

export interface ResearchProgress {
  step: 'planning' | 'searching' | 'processing' | 'completed' | 'failed';
  message: string;
  details?: { academic?: number; web?: number; total?: number };
}

export type ProgressCallback = (progress: ResearchProgress) => void;

export interface HybridSearchResults {
  academic: SemanticScholarPaper[];
  web: GroundedWebSource[];
}

export interface SaveOptions {
  autoSync?: boolean; // If true, triggers RAG sync after saving
}

/**
 * Trigger the RAG sync API for a project
 * Called internally when autoSync is enabled
 */
async function triggerAutoSync(projectId: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/projects/${projectId}/research/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('[ResearchService] Auto-sync failed:', response.status);
    } else {
      console.log('[ResearchService] Auto-sync triggered successfully');
    }
  } catch (error) {
    console.error('[ResearchService] Auto-sync error:', error);
  }
}

export class ResearchService {
  /**
   * Step 1: Generate a research plan (queries) based on project context.
   */
  static async generateResearchPlan(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { topic: true, twist: true, department: true }
    });

    if (!project) throw new Error('Project not found');

    const goal = `Research topic: ${project.topic}. Context: ${project.twist || 'No specific context'}`;
    const tech = project.department ? `Field: ${project.department}` : 'General academic research';
    const audience = 'Academic and technical audience';

    return await ReasoningService.generateSearchQueries(goal, tech, audience);
  }

  /**
   * Execute Hybrid Research: Semantic Scholar (academic) + Gemini Grounding (web) in parallel.
   * Returns the total count of saved documents.
   * @param options.autoSync - If true, triggers RAG sync after saving (default: true)
   */
  static async executeHybridResearch(
    projectId: string,
    queries: string[],
    deepGoal: string,
    onProgress?: ProgressCallback,
    options?: SaveOptions
  ): Promise<number> {
    try {
      onProgress?.({
        step: 'searching',
        message: `Executing hybrid search: ${queries.length} academic queries + web grounding...`
      });

      // Run both searches in parallel
      const [academicPapers, webSources] = await Promise.all([
        SemanticScholarService.searchMultipleQueries(queries, 5),
        GeminiService.groundedSearch(deepGoal)
      ]);

      onProgress?.({
        step: 'processing',
        message: `Found ${academicPapers.length} academic papers and ${webSources.length} web sources. Deduplicating...`,
        details: { academic: academicPapers.length, web: webSources.length }
      });

      // Deduplicate by URL across both sources
      const seenUrls = new Set<string>();
      const uniqueAcademic: SemanticScholarPaper[] = [];
      const uniqueWeb: GroundedWebSource[] = [];

      for (const paper of academicPapers) {
        if (!seenUrls.has(paper.url)) {
          seenUrls.add(paper.url);
          uniqueAcademic.push(paper);
        }
      }

      for (const source of webSources) {
        if (!seenUrls.has(source.url)) {
          seenUrls.add(source.url);
          uniqueWeb.push(source);
        }
      }

      onProgress?.({
        step: 'processing',
        message: `Saving ${uniqueAcademic.length} academic + ${uniqueWeb.length} web sources to database...`,
        details: { academic: uniqueAcademic.length, web: uniqueWeb.length, total: uniqueAcademic.length + uniqueWeb.length }
      });

      // Save academic papers
      let savedCount = 0;
      for (const paper of uniqueAcademic) {
        try {
          await this.saveAcademicPaper(projectId, paper);
          savedCount++;
        } catch (e) {
          console.error(`[ResearchService] Failed to save paper: ${paper.title}`, e);
        }
      }

      // Save web sources
      for (const source of uniqueWeb) {
        try {
          await this.saveWebSource(projectId, source);
          savedCount++;
        } catch (e) {
          console.error(`[ResearchService] Failed to save web source: ${source.title}`, e);
        }
      }

      // Auto-sync to RAG if enabled (default: true)
      const shouldAutoSync = options?.autoSync !== false;
      if (shouldAutoSync && savedCount > 0) {
        onProgress?.({
          step: 'processing',
          message: `Syncing ${savedCount} documents to AI context...`,
          details: { total: savedCount }
        });
        // Fire and forget - don't block on sync
        triggerAutoSync(projectId).catch(err =>
          console.error('[ResearchService] Auto-sync error:', err)
        );
      }

      onProgress?.({
        step: 'completed',
        message: `Research complete. Saved ${savedCount} documents.`,
        details: { total: savedCount }
      });

      return savedCount;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Hybrid Research failed';
      onProgress?.({ step: 'failed', message });
      throw error;
    }
  }

  /**
   * Search-only mode: Runs hybrid search but does NOT save results.
   * Returns deduplicated results for the user to curate before saving.
   */
  static async searchOnly(
    projectId: string,
    queries: string[],
    deepGoal: string,
    onProgress?: ProgressCallback
  ): Promise<HybridSearchResults> {
    try {
      onProgress?.({
        step: 'searching',
        message: `Searching: ${queries.length} academic queries + web grounding...`
      });

      // Run both searches in parallel
      const [academicPapers, webSources] = await Promise.all([
        SemanticScholarService.searchMultipleQueries(queries, 5),
        GeminiService.groundedSearch(deepGoal)
      ]);

      onProgress?.({
        step: 'processing',
        message: `Found ${academicPapers.length} academic papers and ${webSources.length} web sources. Deduplicating...`,
        details: { academic: academicPapers.length, web: webSources.length }
      });

      // Deduplicate by URL across both sources
      const seenUrls = new Set<string>();
      const uniqueAcademic: SemanticScholarPaper[] = [];
      const uniqueWeb: GroundedWebSource[] = [];

      for (const paper of academicPapers) {
        if (!seenUrls.has(paper.url)) {
          seenUrls.add(paper.url);
          uniqueAcademic.push(paper);
        }
      }

      for (const source of webSources) {
        if (!seenUrls.has(source.url)) {
          seenUrls.add(source.url);
          uniqueWeb.push(source);
        }
      }

      onProgress?.({
        step: 'completed',
        message: `Search complete. Found ${uniqueAcademic.length} academic + ${uniqueWeb.length} web sources. Ready for curation.`,
        details: { academic: uniqueAcademic.length, web: uniqueWeb.length, total: uniqueAcademic.length + uniqueWeb.length }
      });

      return { academic: uniqueAcademic, web: uniqueWeb };

    } catch (error: any) {
      onProgress?.({ step: 'failed', message: error.message || 'Search failed' });
      throw error;
    }
  }

  /**
   * Save only user-selected research results to the database.
   * Called after the user curates results from searchOnly().
   * @param options.autoSync - If true, triggers RAG sync after saving (default: true)
   */
  static async saveSelected(
    projectId: string,
    academicPapers: SemanticScholarPaper[],
    webSources: GroundedWebSource[],
    options?: SaveOptions
  ): Promise<any[]> {
    const savedDocs = [];
    let savedCount = 0;

    for (const paper of academicPapers) {
      try {
        const doc = await this.saveAcademicPaper(projectId, paper);
        if (doc) savedDocs.push(doc);
        savedCount++;
      } catch (e) {
        console.error(`[ResearchService] Failed to save paper: ${paper.title}`, e);
      }
    }

    for (const source of webSources) {
      try {
        const doc = await this.saveWebSource(projectId, source);
        if (doc) savedDocs.push(doc);
        savedCount++;
      } catch (e) {
        console.error(`[ResearchService] Failed to save web source: ${source.title}`, e);
      }
    }

    // Auto-sync to RAG if enabled (default: true)
    const shouldAutoSync = options?.autoSync !== false;
    if (shouldAutoSync && savedCount > 0) {
      // Fire and forget - don't block on sync
      triggerAutoSync(projectId).catch(err =>
        console.error('[ResearchService] Auto-sync error:', err)
      );
    }

    return savedDocs;
  }

  /**
   * Save an academic paper as a ResearchDocument (metadata only, no binary)
   */
  static async saveAcademicPaper(projectId: string, paper: SemanticScholarPaper) {
    // Check for duplicates by semanticScholarId or URL
    const existing = await prisma.researchDocument.findFirst({
      where: {
        projectId,
        OR: [
          { semanticScholarId: paper.paperId },
          { fileUrl: paper.url }
        ]
      }
    });

    if (existing) return existing;

    return await prisma.researchDocument.create({
      data: {
        projectId,
        title: paper.title,
        fileUrl: paper.url,
        openAccessUrl: paper.openAccessPdfUrl,
        sourceType: 'ACADEMIC',
        citationCount: paper.citationCount,
        abstractText: paper.abstract,
        authors: paper.authors.join(', '),
        year: paper.year ? String(paper.year) : null,
        venue: paper.venue,
        semanticScholarId: paper.paperId,
        fileName: paper.title.substring(0, 100),
        fileType: 'PDF',
        status: 'INDEXED',
      }
    });
  }

  /**
   * Save a web source as a ResearchDocument (metadata only, no binary)
   */
  static async saveWebSource(projectId: string, source: GroundedWebSource) {
    // Check for duplicates by URL
    const existing = await prisma.researchDocument.findFirst({
      where: { projectId, fileUrl: source.url }
    });

    if (existing) return existing;

    return await prisma.researchDocument.create({
      data: {
        projectId,
        title: source.title,
        fileUrl: source.url,
        sourceType: 'WEB',
        snippet: source.snippet,
        fileName: source.title.substring(0, 100),
        fileType: 'WEB',
        status: 'INDEXED',
      }
    });
  }

}
