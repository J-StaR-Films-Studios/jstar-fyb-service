/**
 * Model identifiers organized by use case
 * Moved here to avoid importing server-side SDKs in client components
 */
export const Models = {
    // PREMIUM (Paid) - Use only when required
    GEMINI_FLASH: 'gemini-2.5-flash',

    // FREE TIER - Validated from OpenRouter catalog (Apr 2026)
    FREE: {
        // TIER 1: Primary Workhorses (Tool Calling + Reasoning)
        TRINITY_LARGE_PREVIEW: 'arcee-ai/trinity-large-preview:free', // #1 Weekly Usage - Academia/Science GOAT, 262k context
        NVIDIA_3_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free', // Solid tool-use, 131k context

        // TIER 2: Reasoning-Focused (use with OpenRouter reasoning param)
        REASONING: 'nvidia/nemotron-3-super-120b-a12b:free', // Reasoning + tools, 262,144 tokens / 262k context
        GLM_AIR: 'z-ai/glm-4.5-air:free', // Hybrid thinking mode, 131k context

        // TIER 3: Code-Focused
        QWEN_CODER: 'qwen/qwen3-coder:free', // Primary code model, 262k context
        LLAMA_CODER: 'meta-llama/llama-3.2-1b-instruct:free', // Lightweight code fallback, 128k context

        // TIER 4: Vision & Multimodal
        NEMOTRON_VL: 'nvidia/nemotron-nano-12b-v2-vl:free', // Vision + Reasoning, 128k context
        NEMOTRON_NANO: 'nvidia/nemotron-nano-9b-v2:free', // Smaller reasoning model, 128k context

        // TIER 5: Lightweight Fallbacks
        GPT_OSS_120B: 'openai/gpt-oss-120b:free', // OpenAI's open MoE
        GEMMA_3: 'google/gemma-3-27b-it:free', // Google's open source
        LLAMA32_3B: 'meta-llama/llama-3.2-3b-instruct:free', // Tiny stable fallback
    },

    // GROQ (Very fast, but has rate limits)
    GROQ: {
        KIMI_K2: 'moonshotai/kimi-k2-instruct',
        KIMI_K2_0905: 'moonshotai/kimi-k2-instruct-0905',
        GPT_OSS_120B: 'openai/gpt-oss-120b',
    },
} as const;
