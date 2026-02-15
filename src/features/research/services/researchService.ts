import { prisma } from '@/lib/prisma';
import { ReasoningService } from './reasoningService';
import { SemanticScholarService, SemanticScholarPaper } from './semanticScholarService';
import { GeminiService, GroundedWebSource } from './geminiService';
import { smartDownload } from '@/lib/network/smartBrowser';

export interface ResearchProgress {
  step: 'planning' | 'searching' | 'processing' | 'completed' | 'failed';
  message: string;
  details?: { academic?: number; web?: number; total?: number };
}

export type ProgressCallback = (progress: ResearchProgress) => void;

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
   */
  static async executeHybridResearch(
    projectId: string,
    queries: string[],
    deepGoal: string,
    onProgress?: ProgressCallback
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

      onProgress?.({
        step: 'completed',
        message: `Research complete. Saved ${savedCount} documents.`,
        details: { total: savedCount }
      });

      return savedCount;

    } catch (error: any) {
      onProgress?.({ step: 'failed', message: error.message || 'Hybrid Research failed' });
      throw error;
    }
  }

  /**
   * Save an academic paper as a ResearchDocument (metadata only, no binary)
   */
  private static async saveAcademicPaper(projectId: string, paper: SemanticScholarPaper) {
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
  private static async saveWebSource(projectId: string, source: GroundedWebSource) {
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

  /**
   * Helper: Transform landing page URLs to direct PDF links where possible
   * Useful for students clicking through to open-access PDFs
   */
  static optimizeDownloadUrl(url: string): string {
    let cleanUrl = url;

    // ArXiv: /abs/ -> /pdf/
    if (cleanUrl.includes('arxiv.org/abs/')) {
      cleanUrl = cleanUrl.replace('arxiv.org/abs/', 'arxiv.org/pdf/') + '.pdf';
    } else if (cleanUrl.includes('arxiv.org/pdf/') && !cleanUrl.toLowerCase().endsWith('.pdf')) {
      cleanUrl += '.pdf';
    }

    // Preprints.org
    if (cleanUrl.includes('preprints.org/manuscript/') && !cleanUrl.includes('/download')) {
      if (/\/v\d+$/.test(cleanUrl)) {
        cleanUrl += '/download';
      }
    }

    // MDPI: /htm -> /pdf
    if (cleanUrl.includes('mdpi.com') && cleanUrl.endsWith('/htm')) {
      cleanUrl = cleanUrl.replace('/htm', '/pdf');
    }

    return cleanUrl;
  }

  /**
   * Download a document from a URL and save to DB (for document uploads)
   * This is separate from the hybrid research flow which is metadata-only
   */
  static async downloadAndSaveSource(projectId: string, url: string, title: string) {
    // Validation
    if (!url || !url.startsWith('http')) return null;

    // Check if exists
    const existing = await prisma.researchDocument.findFirst({
      where: { projectId, fileUrl: url }
    });
    if (existing) return existing;

    // Optimize URL for known academic repositories
    const optimizedUrl = this.optimizeDownloadUrl(url);

    try {
      // Use High-Trust Smart Downloader
      const buffer = await smartDownload(optimizedUrl);

      // Inferred metadata
      const isPdf = optimizedUrl.toLowerCase().endsWith('.pdf') || optimizedUrl.includes('/download');
      const contentType = isPdf ? 'application/pdf' : 'text/html';

      // Create Record
      const doc = await prisma.researchDocument.create({
        data: {
          projectId,
          title,
          fileUrl: url,
          fileName: title === url ? 'External Link' : title.substring(0, 100) + (isPdf ? '.pdf' : '.html'),
          fileType: isPdf ? 'PDF' : 'WEB',
          fileData: isPdf ? Buffer.from(buffer) : undefined,
          mimeType: contentType,
          status: 'PENDING'
        }
      });

      return doc;
    } catch (error: any) {
      console.error(`Failed to download ${url}`, error);

      // FALLBACK: Save the URL anyway as a reference
      try {
        const doc = await prisma.researchDocument.create({
          data: {
            projectId,
            title,
            fileUrl: url,
            fileName: title.substring(0, 100) + '.html',
            fileType: 'WEB',
            fileData: undefined,
            mimeType: 'application/x-web-reference',
            status: 'ERROR',
            importError: `Download failed: ${error.message}`
          }
        });
        return doc;
      } catch (dbError) {
        console.error('Failed to save fallback reference', dbError);
        return null;
      }
    }
  }
}
