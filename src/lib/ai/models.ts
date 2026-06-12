/**
 * Model identifiers organized by use case
 * Moved here to avoid importing server-side SDKs in client components
 */
export const Models = {
    // PREMIUM (Paid) - Use only when required
    GEMINI_FLASH: 'gemini-2.5-flash',

    // FREE TIER - Validated from OpenRouter catalog (Jun 2026)
    FREE: {
        // TIER 1: Primary Workhorses (Tool Calling + Reasoning)
        NEMOTRON_3_ULTRA: 'nvidia/nemotron-3-ultra-550b-a55b:free', // Top free frontier reasoning model, 1M context
        NVIDIA_3_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free', // Solid tool-use, 256k context

        // TIER 2: Reasoning-Focused (use with OpenRouter reasoning param)
        REASONING: 'nvidia/nemotron-3-super-120b-a12b:free', // Reasoning + tools, 1M context
        NEMOTRON_3_NANO_OMNI: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', // Multimodal reasoning, 256k context

        // TIER 3: Code-Focused
        QWEN_CODER: 'qwen/qwen3-coder:free', // Primary code model, 1M context
        LLAMA_CODER: 'meta-llama/llama-3.3-70b-instruct:free', // General/code fallback, 131k context

        // TIER 4: Vision & Multimodal
        NEMOTRON_VL: 'nvidia/nemotron-nano-12b-v2-vl:free', // Vision + Reasoning, 128k context
        NEMOTRON_NANO: 'nvidia/nemotron-nano-9b-v2:free', // Smaller reasoning model, 128k context

        // TIER 5: Lightweight Fallbacks
        GPT_OSS_120B: 'openai/gpt-oss-120b:free', // OpenAI's open MoE
        GEMMA_4: 'google/gemma-4-26b-a4b-it:free', // Google's current free open model
        LLAMA32_3B: 'meta-llama/llama-3.2-3b-instruct:free', // Tiny stable fallback
    },

    // GROQ (Very fast, but has rate limits)
    GROQ: {
        GPT_OSS_120B: 'openai/gpt-oss-120b',
    },
} as const;
