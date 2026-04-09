import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Validate OpenRouter API key
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
}

// Create OpenRouter provider instance
export const openrouter = createOpenRouter({
    apiKey: openrouterApiKey,
});

/**
 * OpenRouter Model IDs
 * Using FREE tier models for cost optimization
 */
export const OpenRouterModels = {
    // FREE Interactive Models
    CHAT: 'arcee-ai/trinity-large-preview:free',
    CHAT_VISION: 'nvidia/nemotron-nano-12b-v2-vl:free',
    REASONING: 'nvidia/nemotron-3-super-120b-a12b:free',

    // Paid tier (if needed)
    KIMI: 'moonshotai/kimi-k2',
} as const;

/**
 * OpenRouter Plugins
 * These can be added to requests for enhanced functionality
 */
export const OpenRouterPlugins = {
    // Auto-fix malformed JSON responses
    RESPONSE_HEALING: { id: 'response-healing' },

    // Web search for real-time information
    WEB_SEARCH: { id: 'web', max_results: 5 },

    // PDF parsing (FREE with pdf-text engine)
    PDF_PARSER: {
        id: 'file-parser',
        pdf: { engine: 'pdf-text' }
    },

    // PDF parsing with OCR (paid)
    PDF_PARSER_OCR: {
        id: 'file-parser',
        pdf: { engine: 'mistral-ocr' }
    },
} as const;

/**
 * Get model with :online suffix for web search
 */
export function getOnlineModel(model: string): string {
    return model.replace(':free', ':free:online');
}

/**
 * Helper to check if a message contains an image
 */
export function messageHasImage(message: unknown): boolean {
    if (typeof message !== 'object' || message === null) return false;
    const msg = message as Record<string, unknown>;

    if (Array.isArray(msg.content)) {
        return msg.content.some((part: unknown) => {
            if (typeof part !== 'object' || part === null) return false;
            const p = part as Record<string, unknown>;
            return p.type === 'image' || p.type === 'image_url';
        });
    }
    return false;
}

/**
 * Get appropriate model based on message content
 */
export function getModelForMessage(messages: unknown[]): string {
    const hasImage = messages.some(messageHasImage);
    return hasImage ? OpenRouterModels.CHAT_VISION : OpenRouterModels.CHAT;
}
