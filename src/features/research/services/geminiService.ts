import { GoogleGenAI } from '@google/genai';
import { Models } from '@/lib/ai/providers';

export class GeminiService {

    /**
     * Execute a Deep Research search using Gemini with Google Search Grounding.
     * Returns a list of source URLs found during the grounding process.
     */
    static async groundedSearch(
        goal: string,
        modelId: string = Models.GEMINI_FLASH // Default to confirmed 2.x model
    ): Promise<Array<{ title: string, url: string }>> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API Key missing');

        const client = new GoogleGenAI({ apiKey });

        // Use the specified model (e.g., gemini-2.0-flash-exp)
        // Note: The SDK might require 'models/' prefix or just the ID. 
        // We'll treat the input as the full ID.

        try {
            // "interactions" API is for the Agent. 
            // "generateContent" is for the Model + Tools.
            // The plan specified "Deep Research (Gemini Native)" using "Tools: [{ googleSearch: {} }]".
            // This suggests using the standard model with tools, NOT the specific "Deep Research Agent" (which is closed preview).
            // We will use standard generateContent with googleSearch tool.

            const response = await client.models.generateContent({
                model: modelId,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `Research the following topic deeply. Find authoritative sources, preferably PDF papers or Open Access articles. \n\nTopic: ${goal}\n\n- Prioritize PDF links if available.\n- Include reputable academic landing pages (ArXiv, Preprints.org) if direct PDFs aren't found.` } // Prompt to encourage tool use
                        ]
                    }
                ],
                config: {
                    tools: [
                        {
                            googleSearch: {} // Enable Grounding
                        }
                    ]
                }
            });

            // Extract Grounding Metadata
            // Extract Grounding Metadata
            // Handle different SDK return structures (wrapped response vs direct response)
            const result: any = response;
            const candidate = result.response?.candidates?.[0] || result.candidates?.[0];
            const groundingMetadata = candidate?.groundingMetadata;

            if (!groundingMetadata?.groundingChunks) {
                console.warn('Gemini response missing grounding metadata.');
                return [];
            }

            // Map chunks to sources
            const sources: Array<{ title: string, url: string }> = [];

            for (const chunk of groundingMetadata.groundingChunks) {
                if (chunk.web?.uri) {
                    sources.push({
                        title: chunk.web.title || 'Untitled Source',
                        url: chunk.web.uri
                    });
                }
            }

            return sources;

        } catch (error) {
            console.error('[GeminiService] Grounded search failed:', error);
            throw error;
        }
    }
}
