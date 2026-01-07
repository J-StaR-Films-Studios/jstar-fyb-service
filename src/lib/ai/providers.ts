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
import { createOpenAI } from '@ai-sdk/openai';

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
    ? createOpenRouter({ apiKey: openrouterApiKey })
    : null;

/**
 * Groq - High-speed inference
 * Best for: Jay chat, fast responses
 */
const groqApiKey = process.env.GROQ_API_KEY;
export const groq = groqApiKey
    ? createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey
    })
    : null;

// ============================================================
// MODEL CONSTANTS
// ============================================================

/**
 * Model identifiers organized by use case
 */
export const Models = {
    // PREMIUM (Paid) - Use only when required
    GEMINI_FLASH: 'gemini-2.5-flash',

    // FREE TIER - Prefer these for cost savings
    FREE: {
        // Best quality free models (OpenRouter)
        DEEPSEEK_V3: 'nex-agi/deepseek-v3.1-nex-n1:free',
        DEEPSEEK_R1: 'tngtech/deepseek-r1t2-chimera:free',
        KIMI_K2: 'moonshotai/kimi-k2-0711:free',
        GPT_OSS_120B: 'openai/gpt-oss-120b:free',

        // Lightweight free models
        MIMO_FLASH: 'xiaomi/mimo-v2-flash:free',
        NEMOTRON_VISION: 'nvidia/nemotron-nano-12b-v2-vl:free',

        // Reasoning-focused (free)
        DEEPSEEK_CHIMERA: 'tngtech/deepseek-r1t2-chimera:free',
    },

    // GROQ (Very fast, but has rate limits)
    GROQ: {
        KIMI_K2: 'moonshotai/kimi-k2-instruct',
        KIMI_K2_0905: 'moonshotai/kimi-k2-instruct-0905',
    },
} as const;

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
