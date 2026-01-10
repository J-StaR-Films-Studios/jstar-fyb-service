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
    ? createOpenRouter({ apiKey: openrouterApiKey })
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
export const Models = {
    // PREMIUM (Paid) - Use only when required
    GEMINI_FLASH: 'gemini-2.5-flash',

    // FREE TIER - Validated from OpenRouter (Jan 2026)
    FREE: {
        // TIER 1: Primary Workhorses (Tool Calling + Reasoning)
        MIMO_V2_FLASH: 'xiaomi/mimo-v2-flash:free', // #1 Weekly Usage - Academia/Science GOAT, 262k context
        NVIDIA_3_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free', // Solid tool-use, 131k context

        // TIER 2: Reasoning-Focused (use with OpenRouter reasoning param)
        REASONING: 'tngtech/tng-r1t-chimera:free', // DeepSeek R1 derivative, FREE
        GLM_AIR: 'z-ai/glm-4.5-air:free', // Hybrid thinking mode, 131k context

        // TIER 3: Code-Focused
        DEVSTRAL: 'mistralai/devstral-2512:free', // #1 Agentic Coder, 262k context
        QWEN_CODER: 'qwen/qwen3-coder:free', // Qwen's specialist, 262k context

        // TIER 4: Vision & Multimodal
        NEMOTRON_VL: 'nvidia/nemotron-nano-12b-v2-vl:free', // Vision + Reasoning, 128k context
        NEMOTRON_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free', // Agent-focused MoE, 256k context

        // TIER 5: Lightweight Fallbacks
        GPT_OSS_120B: 'openai/gpt-oss-120b:free', // OpenAI's open MoE
        GEMMA_3: 'google/gemma-3-27b-it:free', // Google's open source
        QWEN3_4B: 'qwen/qwen3-4b:free', // Tiny dense model
    },

    // GROQ (Very fast, but has rate limits)
    GROQ: {
        KIMI_K2: 'moonshotai/kimi-k2-instruct',
        KIMI_K2_0905: 'moonshotai/kimi-k2-instruct-0905',
        GPT_OSS_120B: 'openai/gpt-oss-120b',
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
