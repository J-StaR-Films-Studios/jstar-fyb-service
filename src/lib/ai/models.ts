/** Model IDs are separate from server-side providers for client imports. */
export const Models = {
    LUNA: 'openai/gpt-6-luna',
    GEMINI_FLASH: 'gemini-2.5-flash', // Native Google Search and File Search grounding
} as const;

export const lunaReasoning = {
    low: { openrouter: { reasoning: { effort: 'low' } } },
    medium: { openrouter: { reasoning: { effort: 'medium' } } },
    high: { openrouter: { reasoning: { effort: 'high' } } },
} as const;
