import type { LanguageModel } from 'ai';
import { gemini, openrouter, Models, lunaReasoning } from './providers';

export type ModelQuality = 'premium' | 'high' | 'standard';

export interface RouteConfig {
    /** Native Google File Search requires Gemini. */
    grounding?: boolean;
    reasoning?: boolean;
    quality?: ModelQuality;
    vision?: boolean;
    effort?: keyof typeof lunaReasoning;
}

export interface RouteResult {
    model: LanguageModel;
    provider: 'gemini' | 'openrouter';
    modelId: string;
    providerOptions?: (typeof lunaReasoning)[keyof typeof lunaReasoning];
}

/** Use one OpenRouter model with effort matched to the task; keep native grounding on Google. */
export function selectModel(config: RouteConfig = {}): RouteResult {
    const { grounding, reasoning, quality = 'standard', vision } = config;

    if (grounding) {
        if (!gemini) throw new Error('Grounding requires GEMINI_API_KEY');
        return {
            model: gemini(Models.GEMINI_FLASH),
            provider: 'gemini',
            modelId: Models.GEMINI_FLASH,
        };
    }

    if (!openrouter) throw new Error('OPENROUTER_API_KEY is required');

    const effort = config.effort ?? (reasoning || quality === 'high' || quality === 'premium'
        ? 'high'
        : vision ? 'medium' : 'low');

    return {
        model: openrouter(Models.LUNA),
        provider: 'openrouter',
        modelId: Models.LUNA,
        providerOptions: lunaReasoning[effort],
    };
}

export function getTextGenerationModel() {
    return selectModel({ quality: 'high' });
}

export function getGroundedModel() {
    return selectModel({ grounding: true });
}

export function getReasoningModel() {
    return selectModel({ reasoning: true });
}

export function getVisionModel() {
    return selectModel({ vision: true });
}
