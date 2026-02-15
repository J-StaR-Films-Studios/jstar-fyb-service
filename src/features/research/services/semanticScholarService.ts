/**
 * Semantic Scholar Service
 * Wraps the Semantic Scholar Academic Graph API for searching academic papers.
 * 
 * Rate limits:
 * - With API key: 5000 requests/5 min, 10 req/sec
 * - Without API key: 100 requests/5 min (public rate limits)
 * 
 * Set SEMANTIC_SCHOLAR_API_KEY in your environment for higher limits.
 * Get a free API key at: https://www.semanticscholar.org/product/api
 * 
 * @see https://api.semanticscholar.org/
 */

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  citationCount: number;
  openAccessPdfUrl: string | null;
  url: string;
  venue: string | null;
}

interface SemanticScholarApiResponse {
  total: number;
  data: Array<{
    paperId: string;
    title: string;
    authors: Array<{ name: string }>;
    year: number | null;
    abstract: string | null;
    citationCount: number;
    openAccessPdf: { url: string } | null;
    url: string;
    venue: string | null;
  }>;
}

const API_BASE = 'https://api.semanticscholar.org/graph/v1';
const DEFAULT_FIELDS = 'title,authors,year,abstract,citationCount,openAccessPdf,url,venue';
const REQUEST_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 3;

/**
 * Get the Semantic Scholar API key from environment (optional)
 * With API key: 5000 requests/5 min, 10 req/sec
 * Without API key: 100 requests/5 min (public rate limits)
 */
function getApiKey(): string | undefined {
  return process.env.SEMANTIC_SCHOLAR_API_KEY;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const apiKey = getApiKey();

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: Object.keys(headers).length > 0 ? headers : undefined
    });
    
    // Handle rate limiting (429) and server errors with backoff
    if (response.status === 429 || response.status >= 500) {
      if (retries > 0) {
        clearTimeout(timeoutId);
        await sleep(RETRY_DELAY_MS * (MAX_RETRIES - retries + 1));
        return fetchWithRetry(url, retries - 1);
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries > 0 && error instanceof Error && error.name === 'AbortError') {
      // Timeout - retry
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Transform raw API response to our typed interface
 */
function transformPaper(raw: SemanticScholarApiResponse['data'][0]): SemanticScholarPaper {
  return {
    paperId: raw.paperId,
    title: raw.title,
    authors: raw.authors.map((a) => a.name),
    year: raw.year,
    abstract: raw.abstract,
    citationCount: raw.citationCount ?? 0,
    openAccessPdfUrl: raw.openAccessPdf?.url ?? null,
    url: raw.url,
    venue: raw.venue,
  };
}

export class SemanticScholarService {
  /**
   * Search for academic papers matching a query
   * @param query Search terms
   * @param limit Maximum results to return (default: 10)
   */
  static async searchPapers(
    query: string,
    limit = 10
  ): Promise<SemanticScholarPaper[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${API_BASE}/paper/search?query=${encodedQuery}&fields=${DEFAULT_FIELDS}&limit=${limit}`;

    try {
      const response = await fetchWithRetry(url);

      if (!response.ok) {
        console.error(`[SemanticScholar] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: SemanticScholarApiResponse = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map(transformPaper);
    } catch (error) {
      console.error('[SemanticScholar] Search failed:', error);
      return [];
    }
  }

  /**
   * Search for papers using multiple queries, deduplicating by paperId
   * @param queries Array of search terms
   * @param limitPerQuery Maximum results per query (default: 5)
   */
  static async searchMultipleQueries(
    queries: string[],
    limitPerQuery = 5
  ): Promise<SemanticScholarPaper[]> {
    const allPapers = new Map<string, SemanticScholarPaper>();

    for (let i = 0; i < queries.length; i++) {
      // Add 200ms delay between requests for rate limiting
      if (i > 0) {
        await sleep(200);
      }

      const papers = await this.searchPapers(queries[i], limitPerQuery);
      
      // Deduplicate by paperId
      for (const paper of papers) {
        if (!allPapers.has(paper.paperId)) {
          allPapers.set(paper.paperId, paper);
        }
      }
    }

    // Sort by citation count (descending)
    return Array.from(allPapers.values()).sort(
      (a, b) => b.citationCount - a.citationCount
    );
  }

  /**
   * Get a single paper by its Semantic Scholar ID
   * @param paperId The paper's unique identifier
   */
  static async getPaperById(paperId: string): Promise<SemanticScholarPaper | null> {
    const url = `${API_BASE}/paper/${paperId}?fields=${DEFAULT_FIELDS}`;

    try {
      const response = await fetchWithRetry(url);

      if (!response.ok) {
        return null;
      }

      const raw = await response.json();
      return transformPaper(raw);
    } catch (error) {
      console.error('[SemanticScholar] Get paper failed:', error);
      return null;
    }
  }
}
