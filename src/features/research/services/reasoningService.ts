import { generateObject } from 'ai';
import { openrouter, Models } from '@/lib/ai/providers';
import { z } from 'zod';

// Define the schema for search queries
const SearchQueriesSchema = z.object({
    core_problem_queries: z.array(z.string()).describe("Queries for foundational research and academic papers"),
    technical_queries: z.array(z.string()).describe("Queries for finding technical guides and tools"),
    context_queries: z.array(z.string()).describe("Queries for ethical implications and user impact")
});

export type SearchQueries = z.infer<typeof SearchQueriesSchema>;

export class ReasoningService {
    /**
     * Generate targeted search queries for a project using the reasoning model.
     */
    static async generateSearchQueries(
        goal: string,
        technologies: string,
        audience: string
    ): Promise<SearchQueries> {
        if (!openrouter) {
            throw new Error('OpenRouter provider is not configured properly.');
        }

        const systemPrompt = `
You are an expert research strategist. Your task is to generate a list of targeted search queries for a given project.
Analyze the project details provided and create a list of search queries broken down into three strategic categories:

1. Core Problem & Domain Research (The "What")
2. Technical Implementation & Tools (The "How")
3. Context, Ethics, and User Impact (The "Why" & "For Whom")

CRITICAL INSTRUCTION - THE "OPEN ACCESS SNIPER" PROTOCOL:
You must optimize queries to find DIRECT PDF LINKS and institutional repositories.
For every 5 queries you generate, ensure they follow these "Master Patterns":

1. The Repository Hunter: "{topic} filetype:pdf (site:.edu OR site:.ac.uk OR site:.gov)"
2. The Pre-Print Aggregator: "{topic} (site:arxiv.org OR site:biorxiv.org OR site:ssrn.com)"
3. The Author's Copy Bypass: "{topic} filetype:pdf (accepted manuscript OR author's copy OR draft version)"
4. The Paywall Filter: "{topic} filetype:pdf -site:ieee.org -site:nature.com -site:springer.com"
5. The Directory Scraper: "intitle:index of {topic} filetype:pdf"

DO NOT return generic queries like "History of AI".
DO return precise Dorks like "History of AI filetype:pdf site:.edu".
`;

        const userPrompt = `
--- MY PROJECT DETAILS ---

*   **PROJECT GOAL:** ${goal}

*   **KEY TECHNOLOGIES & METHODS:** ${technologies}

*   **TARGET AUDIENCE & CONTEXT:** ${audience}
`;

        if (!openrouter) throw new Error('OpenRouter provider is not configured (missing API key).');

        try {
            // Use TRINITY_LARGE_PREVIEW (trinity-large-preview) - supports structured output/tool calling
            // StepFun models don't support JSON schema response_format
            const result = await generateObject({
                model: openrouter(Models.FREE.TRINITY_LARGE_PREVIEW),
                schema: SearchQueriesSchema,
                system: systemPrompt,
                prompt: userPrompt,
            });

            return result.object;
        } catch (error) {
            console.error('[ReasoningService] Error generating search queries:', error);
            // Fallback or re-throw
            throw error;
        }
    }
}
