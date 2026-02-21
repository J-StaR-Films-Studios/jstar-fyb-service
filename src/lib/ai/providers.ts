/**
 * AI Provider Configuration
 * 
 * Centralized provider initialization for cost-optimized model routing.
 * 
 * ROUTING STRATEGY:
 * - Grounded/Tool-based → Google Gemini (native support required)
 * - Standard text generation → FREE tier OpenRouter models
 * 
 * @module lib/ai/providers
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';

// ============================================================
// PROVIDER INSTANCES
// ============================================================

/**
 * Google Gemini - Used for grounded generation and tool-based chat
 * Required for: File search grounding, native tool support
 */
const geminiApiKey = process.env.GEMINI_API_KEY;
export const gemini = geminiApiKey
    ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
    : null;

/**
 * OpenRouter - Used for FREE tier models
 * Best for: Standard text generation, non-critical tasks
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

/**
 * Groq - High-speed inference
 * Best for: Jay chat, fast responses
 */
const groqApiKey = process.env.GROQ_API_KEY;
export const groq = groqApiKey
    ? createGroq({
        apiKey: groqApiKey
    })
    : null;

// ============================================================
// MODEL CONSTANTS
// ============================================================

/**
 * Model identifiers organized by use case
 */
export { Models } from "./models";

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
 * Check if we have a working Groq provider
 */
export function hasGroq(): boolean {
    return !!groq;
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus() {
    return {
        gemini: hasGemini(),
        openrouter: hasOpenRouter(),
        groq: hasGroq(),
    };
}
