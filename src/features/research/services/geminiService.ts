import { GoogleGenAI } from '@google/genai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Models, openrouter } from '@/lib/ai/providers';

export interface GroundedWebSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: 'WEB';
}

const SnippetSchema = z.object({
  sources: z.array(z.object({
    url: z.string(),
    snippet: z.string().describe('A 1-2 sentence relevance summary for academic research'),
  })),
});

export class GeminiService {
  /**
   * Execute a grounded search using Gemini with Google Search Grounding.
   * Returns structured sources with AI-generated snippets.
   */
  static async groundedSearch(
    goal: string,
    modelId: string = Models.GEMINI_FLASH
  ): Promise<GroundedWebSource[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[GeminiService] Missing GEMINI_API_KEY');
      return [];
    }

    const client = new GoogleGenAI({ apiKey });

    try {
      const response = await client.models.generateContent({
        model: modelId,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Research the following topic deeply. Find authoritative sources, preferably academic papers, PDF documents, or Open Access articles.

Topic: ${goal}

- Prioritize PDF links and academic sources if available.
- Include reputable academic landing pages (ArXiv, Semantic Scholar, Google Scholar).`
              }
            ]
          }
        ],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      // Extract grounding metadata
      const result: any = response;
      const candidate = result.response?.candidates?.[0] || result.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;

      if (!groundingMetadata?.groundingChunks) {
        console.warn('[GeminiService] No grounding metadata found');
        return [];
      }

      // Deduplicate URLs
      const seen = new Set<string>();
      const rawSources: Array<{ title: string; url: string }> = [];

      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && !seen.has(chunk.web.uri)) {
          seen.add(chunk.web.uri);
          rawSources.push({
            title: chunk.web.title || 'Untitled Source',
            url: chunk.web.uri,
          });
        }
      }

      if (rawSources.length === 0) {
        return [];
      }

      // Generate snippets using OpenRouter free model
      const sourcesWithSnippets = await this.generateSnippets(goal, rawSources);

      return sourcesWithSnippets;

    } catch (error) {
      console.error('[GeminiService] Grounded search failed:', error);
      return [];
    }
  }

  /**
   * Generate relevance snippets for sources using OpenRouter free model
   */
  private static async generateSnippets(
    goal: string,
    sources: Array<{ title: string; url: string }>
  ): Promise<GroundedWebSource[]> {
    if (!openrouter) {
      console.warn('[GeminiService] OpenRouter not available, returning sources without snippets');
      return sources.map(s => ({
        title: s.title,
        url: s.url,
        snippet: 'Relevance summary unavailable',
        sourceType: 'WEB' as const,
      }));
    }

    try {
      const { object } = await generateObject({
        model: openrouter(Models.FREE.MIMO_V2_FLASH),
        schema: SnippetSchema,
        prompt: `Generate brief relevance snippets (1-2 sentences) for each source related to this research topic.

Topic: ${goal}

Sources:
${sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}`).join('\n')}

For each source, explain why it might be relevant for researching the topic academically.`,
      });

      // Merge snippets with sources
      return sources.map((source) => {
        const matched = object.sources.find(s => s.url === source.url);
        return {
          title: source.title,
          url: source.url,
          snippet: matched?.snippet || 'Academic relevance summary',
          sourceType: 'WEB' as const,
        };
      });

    } catch (error) {
      console.error('[GeminiService] Snippet generation failed:', error);
      // Return sources without snippets on error
      return sources.map(s => ({
        title: s.title,
        url: s.url,
        snippet: 'Relevance summary unavailable',
        sourceType: 'WEB' as const,
      }));
    }
  }
}