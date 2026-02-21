import { ResearchProgress } from "@/features/research/services/researchService";
import { SemanticScholarPaper } from '@/features/research/services/semanticScholarService';
import { GroundedWebSource } from '@/features/research/services/geminiService';

export interface ResearchPlan {
  core_problem_queries: string[];
  technical_queries: string[];
  context_queries: string[];
}

export interface SearchResults {
  academic: SemanticScholarPaper[];
  web: GroundedWebSource[];
}

export class ResearchClient {
  /**
   * Generate a research plan based on project context
   */
  static async generatePlan(projectId: string): Promise<ResearchPlan> {
    const response = await fetch('/api/research/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });

    if (!response.ok) {
      throw new Error(`Plan generation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Execute Hybrid Research with streaming progress
   * Runs Semantic Scholar (academic) + Gemini Grounding (web) in parallel
   */
  static async executeResearch(
    projectId: string,
    params: { queries: string[]; deepGoal: string },
    onProgress: (progress: ResearchProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/research/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        queries: params.queries,
        deepGoal: params.deepGoal
      })
    });

    if (!response.ok) {
      throw new Error(`Execution failed: ${response.statusText}`);
    }

    if (!response.body) return;

    // Handle Streaming Response (NDJSON-like lines)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process lines
      const lines = buffer.split('\n');
      // Keep the last partial line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const progress = JSON.parse(line);
          onProgress(progress);
        } catch (e) {
          console.warn('Failed to parse progress update:', line);
        }
      }
    }
  }

  /**
   * Search-only mode: Finds papers but does NOT save them.
   * Streams progress updates and returns the raw results for curation.
   */
  static async searchOnly(
    projectId: string,
    params: { queries: string[]; deepGoal: string },
    onProgress: (progress: ResearchProgress) => void
  ): Promise<SearchResults> {
    const response = await fetch('/api/research/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        queries: params.queries,
        deepGoal: params.deepGoal
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    let searchResults: SearchResults = { academic: [], web: [] };

    // Handle Streaming Response (NDJSON-like lines)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);

          // Check if this is the final results line
          if (parsed.step === 'results' && parsed.results) {
            searchResults = parsed.results;
          } else {
            onProgress(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse progress update:', line);
        }
      }
    }

    return searchResults;
  }

  /**
   * Save only the user-selected papers and web sources to the database.
   */
  static async saveSelected(
    projectId: string,
    selectedPapers: SemanticScholarPaper[],
    selectedWebSources: GroundedWebSource[]
  ): Promise<{ success: boolean; savedCount: number; savedDocs: any[]; message: string }> {
    const response = await fetch('/api/research/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        selectedPapers,
        selectedWebSources
      })
    });

    if (!response.ok) {
      throw new Error(`Save failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
