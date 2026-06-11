/**
 * AI Model Router
 * 
 * Simplified routing logic for the ToolLoopAgent architecture.
 * Selects the optimal model based on request requirements.
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
     * Does the request need file grounding? (requires native Gemini)
     */
    grounding?: boolean;

    /**
     * Does the request require reasoning/chain-of-thought?
     */
    reasoning?: boolean;

    /**
     * Quality tier preference
     * - 'premium': Always use Gemini (paid)
     * - 'high': Use best available free model
     * - 'standard': Use reliable free models
     * - 'free': Use any free model, lowest quality acceptable
     */
    quality?: ModelQuality;

    /**
     * Does the request process images?
     */
    vision?: boolean;

    /**
     * Force a specific model ID (bypasses other logic)
     */
    forceModel?: string;
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
 * Select the optimal model based on request configuration.
 * 
 * Simplified for ToolLoopAgent architecture - the agent handles
 * tool loop internally, so we just need to return the right model.
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
 * // For reasoning tasks
 * const { model } = selectModel({ reasoning: true });
 * 
 * // For vision tasks
 * const { model } = selectModel({ vision: true });
 * ```
 */
export function selectModel(config: RouteConfig = {}): RouteResult {
    const { grounding, reasoning, quality = 'standard', vision, forceModel } = config;

    // --------------------------------------------------------
    // OVERRIDE: Force specific model
    // --------------------------------------------------------
    if (forceModel) {
        return selectForcedModel(forceModel);
    }

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
    // RULE 2: Reasoning/Thinking models
    // --------------------------------------------------------
    if (reasoning) {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.REASONING),
                provider: 'openrouter',
                modelId: Models.FREE.REASONING,
                isFree: true,
                reason: 'Reasoning task using free thinking model',
            };
        }
        // Fallback to Gemini if OpenRouter not available
        if (hasGemini()) {
            return {
                model: gemini!(Models.GEMINI_FLASH),
                provider: 'gemini',
                modelId: Models.GEMINI_FLASH,
                isFree: false,
                reason: 'Reasoning fallback to Gemini',
            };
        }
    }

    // --------------------------------------------------------
    // RULE 3: Vision requires vision-capable model
    // --------------------------------------------------------
    if (vision) {
        if (hasOpenRouter()) {
            return {
                model: openrouter!(Models.FREE.NEMOTRON_VL),
                provider: 'openrouter',
                modelId: Models.FREE.NEMOTRON_VL,
                isFree: true,
                reason: 'Vision task using free vision model',
            };
        }
        if (hasGemini()) {
            return {
                model: gemini!(Models.GEMINI_FLASH),
                provider: 'gemini',
                modelId: Models.GEMINI_FLASH,
                isFree: false,
                reason: 'Vision fallback to Gemini',
            };
        }
    }

    // --------------------------------------------------------
    // RULE 4: Quality-based routing (default)
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

    // High/Standard/Free: Use OpenRouter free tier
    if (hasOpenRouter()) {
        const modelId = quality === 'high'
            ? Models.FREE.NEMOTRON_3_ULTRA
            : Models.FREE.NVIDIA_3_NANO;

        return {
            model: openrouter!(modelId),
            provider: 'openrouter',
            modelId,
            isFree: true,
            reason: `${quality} quality using free tier model`,
        };
    }

    // Fallback to Groq
    if (hasGroq()) {
        return {
            model: groq!(Models.GROQ.GPT_OSS_120B),
            provider: 'groq',
            modelId: Models.GROQ.GPT_OSS_120B,
            isFree: false,
            reason: 'Fallback to Groq',
        };
    }

    // Last resort: Gemini
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

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if an OpenRouter model ID is a known free tier model.
 * Returns true for models in Models.FREE, false otherwise.
 * Returns undefined if we cannot determine (unknown model).
 */
function isOpenRouterFreeModel(modelId: string): boolean | undefined {
    const freeModels = Object.values(Models.FREE) as string[];
    return freeModels.includes(modelId) ? true : undefined;
}

/**
 * Handle forced model selection.
 */
function selectForcedModel(forceModel: string): RouteResult {
    if (forceModel.includes('gemini') && hasGemini()) {
        return {
            model: gemini!(forceModel),
            provider: 'gemini',
            modelId: forceModel,
            isFree: false,
            reason: 'Forced model override (Gemini)',
        };
    }

    if ((Object.values(Models.GROQ) as string[]).includes(forceModel) && hasGroq()) {
        return {
            model: groq!(forceModel),
            provider: 'groq',
            modelId: forceModel,
            isFree: false,
            reason: 'Forced model override (Groq)',
        };
    }

    if (hasOpenRouter()) {
        const isFree = isOpenRouterFreeModel(forceModel);
        return {
            model: openrouter!(forceModel),
            provider: 'openrouter',
            modelId: forceModel,
            isFree: isFree ?? false,
            reason: 'Forced model override (OpenRouter)',
        };
    }

    throw new Error(`Cannot force model ${forceModel}: no suitable provider available`);
}

/**
 * Get a model for text generation (no special requirements).
 * Always prefers FREE tier.
 */
export function getTextGenerationModel() {
    return selectModel({ quality: 'high' });
}

/**
 * Get a model for grounded generation.
 * MUST use native Gemini.
 */
export function getGroundedModel() {
    return selectModel({ grounding: true });
}

/**
 * Get a reasoning/thinking model.
 */
export function getReasoningModel() {
    return selectModel({ reasoning: true });
}

/**
 * Get a vision-capable model.
 */
export function getVisionModel() {
    return selectModel({ vision: true });
}
