/**
 * AI Model Router
 * 
 * Smart routing logic to select the best model based on request requirements.
 * Prioritizes FREE tier models for cost savings, falls back to premium when needed.
 * 
 * @module lib/ai/router
 */

import { gemini, openrouter, groq, Models, hasGemini, hasOpenRouter, hasGroq } from './providers';

// ============================================================
// ROUTING TYPES
// ============================================================

export type ModelQuality = 'premium' | 'high' | 'standard' | 'free';

export interface RouteConfig {
    /**
     * Does the request use tools? (requires native Gemini)
     */
    tools?: boolean;

    /**
     * Does the request need file grounding? (requires native Gemini)
     */
    grounding?: boolean;

    /**
     * Quality tier preference
     * - 'premium': Always use Gemini (paid)
     * - 'high': Use best available free model (DeepSeek V3, Kimi K2)
     * - 'standard': Use reliable free models
     * - 'free': Use any free model, lowest quality acceptable
     */
    quality?: ModelQuality;

    /**
     * Does the request process images?
     */
    vision?: boolean;

    /**
     * Does the request require reasoning/chain-of-thought?
     */
    reasoning?: boolean;
}

export interface RouteResult {
    /**
     * The AI SDK model instance to use
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;


    /**
     * Which provider was selected
     */
    provider: 'gemini' | 'openrouter' | 'groq';

    /**
     * The model ID string
     */
    modelId: string;

    /**
     * Is this a free tier model?
     */
    isFree: boolean;

    /**
     * Reason for selection (for logging)
     */
    reason: string;
}

// ============================================================
// ROUTING LOGIC
// ============================================================

/**
 * Select the optimal model based on request configuration
 * 
 * @param config - Routing configuration
 * @returns Model selection with metadata
 * 
 * @example
 * ```ts
 * // For grounded generation (MUST use Gemini)
 * const { model } = selectModel({ grounding: true });
 * 
 * // For standard chapter generation (use FREE tier)
 * const { model } = selectModel({ quality: 'high' });
 * 
 * // For simple formatting (use any free model)
 * const { model } = selectModel({ quality: 'free' });
 * ```
 */
export function selectModel(config: RouteConfig = {}): RouteResult {
    const { tools, grounding, quality = 'standard', vision, reasoning } = config;

    // --------------------------------------------------------
    // RULE 1: Grounding REQUIRES native Gemini
    // --------------------------------------------------------
    if (grounding) {
        if (!hasGemini()) {
            throw new Error('Grounding requested but GEMINI_API_KEY is not configured');
        }
        return {
            model: gemini!(Models.GEMINI_FLASH),
            provider: 'gemini',
            modelId: Models.GEMINI_FLASH,
            isFree: false,
            reason: 'File grounding requires native Gemini API',
        };
    }

    // --------------------------------------------------------
    // RULE 2: Tools work best on native Gemini
    // --------------------------------------------------------
    // --------------------------------------------------------
    // RULE 2: Tools work best on native Gemini, but allow others if configured
    // --------------------------------------------------------
    if (tools) {
        // If specific low cost/free quality requested, try to use capable free models
        if ((quality === 'high' || quality === 'standard' || quality === 'free') && hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.DEEPSEEK_V3), // DeepSeek V3 supports tools
                provider: 'openrouter',
                modelId: Models.FREE.DEEPSEEK_V3,
                isFree: true,
                reason: 'Tool calling using capable free model (DeepSeek V3)',
            };
        }

        if (hasGemini()) {
            return {
                model: gemini!(Models.GEMINI_FLASH),
                provider: 'gemini',
                modelId: Models.GEMINI_FLASH,
                isFree: false,
                reason: 'Tool calling optimized for native Gemini',
            };
        }
        // Fallback: Groq also supports tools
        if (hasGroq()) {
            return {
                model: groq!(Models.GROQ.KIMI_K2),
                provider: 'groq',
                modelId: Models.GROQ.KIMI_K2,
                isFree: false,
                reason: 'Tool calling fallback to Groq (Gemini unavailable)',
            };
        }
    }

    // --------------------------------------------------------
    // RULE 3: Vision requires vision-capable model
    // --------------------------------------------------------
    if (vision) {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.NEMOTRON_VISION),
                provider: 'openrouter',
                modelId: Models.FREE.NEMOTRON_VISION,
                isFree: true,
                reason: 'Vision task using free Nemotron model',
            };
        }
        if (hasGemini()) {
            return {
                model: gemini!(Models.GEMINI_FLASH),
                provider: 'gemini',
                modelId: Models.GEMINI_FLASH,
                isFree: false,
                reason: 'Vision fallback to Gemini (no free vision available)',
            };
        }
    }

    // --------------------------------------------------------
    // RULE 4: Reasoning tasks prefer DeepSeek R1
    // --------------------------------------------------------
    if (reasoning) {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.DEEPSEEK_R1),
                provider: 'openrouter',
                modelId: Models.FREE.DEEPSEEK_R1,
                isFree: true,
                reason: 'Reasoning task using free DeepSeek R1',
            };
        }
    }

    // --------------------------------------------------------
    // RULE 5: Quality-based routing (FREE TIER PRIORITY)
    // --------------------------------------------------------

    // Premium: Always Gemini
    if (quality === 'premium') {
        if (!hasGemini()) {
            throw new Error('Premium quality requested but GEMINI_API_KEY is not configured');
        }
        return {
            model: gemini!(Models.GEMINI_FLASH),
            provider: 'gemini',
            modelId: Models.GEMINI_FLASH,
            isFree: false,
            reason: 'Premium quality explicitly requested',
        };
    }

    // High: Best free models (DeepSeek V3, Kimi K2)
    if (quality === 'high') {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.DEEPSEEK_V3),
                provider: 'openrouter',
                modelId: Models.FREE.DEEPSEEK_V3,
                isFree: true,
                reason: 'High quality using free DeepSeek V3',
            };
        }
        // Fallback to Groq
        if (hasGroq()) {
            return {
                model: groq!(Models.GROQ.KIMI_K2),
                provider: 'groq',
                modelId: Models.GROQ.KIMI_K2,
                isFree: false,
                reason: 'High quality fallback to Groq Kimi K2',
            };
        }
    }

    // Standard: Reliable free models
    if (quality === 'standard' || quality === 'free') {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.KIMI_K2),
                provider: 'openrouter',
                modelId: Models.FREE.KIMI_K2,
                isFree: true,
                reason: `${quality} quality using free Kimi K2`,
            };
        }
        if (hasGroq()) {
            return {
                model: groq!(Models.GROQ.KIMI_K2),
                provider: 'groq',
                modelId: Models.GROQ.KIMI_K2,
                isFree: false,
                reason: `${quality} quality fallback to Groq`,
            };
        }
    }

    // --------------------------------------------------------
    // FALLBACK: Use whatever is available
    // --------------------------------------------------------
    if (hasGemini()) {
        return {
            model: gemini!(Models.GEMINI_FLASH),
            provider: 'gemini',
            modelId: Models.GEMINI_FLASH,
            isFree: false,
            reason: 'Last resort fallback to Gemini',
        };
    }

    throw new Error('No AI providers configured. Please set at least one of: GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY');
}

/**
 * Get a model specifically for text generation (no tools/grounding)
 * Always prefers FREE tier
 */
export function getTextGenerationModel() {
    return selectModel({ quality: 'high' });
}

/**
 * Get a model for chat with tools
 * Uses premium Gemini for best tool support
 */
export function getChatWithToolsModel() {
    return selectModel({ tools: true });
}

/**
 * Get a model for grounded generation
 * MUST use native Gemini
 */
export function getGroundedModel() {
    return selectModel({ grounding: true });
}
