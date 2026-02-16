/**
 * Model identifiers organized by use case
 * Moved here to avoid importing server-side SDKs in client components
 */
export const Models = {
    // PREMIUM (Paid) - Use only when required
    GEMINI_FLASH: 'gemini-2.5-flash',

    // FREE TIER - Validated from OpenRouter (Jan 2026)
    FREE: {
        // TIER 1: Primary Workhorses (Tool Calling + Reasoning)
        MIMO_V2_FLASH: 'arcee-ai/trinity-large-preview:free', // #1 Weekly Usage - Academia/Science GOAT, 262k context
        NVIDIA_3_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free', // Solid tool-use, 131k context

        // TIER 2: Reasoning-Focused (use with OpenRouter reasoning param)
        REASONING: 'stepfun/step-3.5-flash:free', // DeepSeek R1 derivative, FREE
        GLM_AIR: 'z-ai/glm-4.5-air:free', // Hybrid thinking mode, 131k context

        // TIER 3: Code-Focused
        QWEN_THINKING: 'qwen/qwen3-235b-a22b-thinking-2507', // #1 Agentic Coder, 262k context
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
