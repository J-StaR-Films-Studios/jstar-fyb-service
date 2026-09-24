/**
 * AI Provider Configuration
 * 
 * OpenRouter handles inference; native Gemini handles Google Search and File Search grounding.
 * 
 * @module lib/ai/providers
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// ============================================================
// PROVIDER INSTANCES
// ============================================================

/**
 * Google Gemini - Used for native grounding
 */
const geminiApiKey = process.env.GEMINI_API_KEY;
export const gemini = geminiApiKey
    ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
    : null;

/**
 * OpenRouter - GPT-6 Luna for text, tools and vision
 */
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
export const openrouter = openrouterApiKey
    ? createOpenRouter({
        apiKey: openrouterApiKey,
        headers: {
            'HTTP-Referer': 'https://fyb.jstarstudios.com/', // Site URL for rankings
            'X-Title': 'JStar FYB', // App name in dashboard
        }
    })
    : null;

// ============================================================
// MODEL CONSTANTS
// ============================================================

/**
 * Model identifiers organized by use case
 */
export { Models, lunaReasoning } from './models';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if we have a working Gemini provider
 */
export function hasGemini(): boolean {
    return !!gemini;
}

/**
 * Check if we have a working OpenRouter provider
 */
export function hasOpenRouter(): boolean {
    return !!openrouter;
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus() {
    return {
        gemini: hasGemini(),
        openrouter: hasOpenRouter(),
    };
}
