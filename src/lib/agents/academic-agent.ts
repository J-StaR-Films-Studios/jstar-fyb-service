/**
 * Academic Agent
 * 
 * The ToolLoopAgent definition for Monji Academic Copilot.
 * Handles multi-step tool execution for academic writing tasks.
 * 
 * @module lib/agents/academic-agent
 */

import {
    ToolLoopAgent,
    stepCountIs,
    InferAgentUIMessage,
    type LanguageModel,
} from 'ai';
import { z } from 'zod';
import { academicTools, type AcademicTools } from '@/lib/tools';
import { MONJI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';
import { COMMON_ACADEMIC_RULES } from '@/features/bot/prompts/chapterPrompts';
import { openrouter, Models } from '@/lib/ai/providers';

// ============================================================
// AGENT CONFIGURATION TYPES
// ============================================================

/**
 * Configuration for the academic agent.
 */
export interface AcademicAgentConfig {
    /** Whether to use a reasoning/thinking model */
    useThinking?: boolean;

    /** Reasoning effort level (for thinking models) */
    reasoningEffort?: 'low' | 'medium' | 'high';

    /** Custom system prompt additions */
    systemPromptAdditions?: string;

    /** Maximum number of tool execution steps */
    maxSteps?: number;
}

/**
 * Context passed to each tool execution.
 */
export interface AcademicExecutionContext {
    /** Project ID */
    projectId: string;

    /** Conversation/thread ID */
    conversationId: string | null;

    /** Active chapter number (if focused) */
    activeChapterNumber?: number;

    /** Pre-built chapter context text */
    chaptersText: string;

    /** User ID (if authenticated) */
    userId?: string;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: Required<Omit<AcademicAgentConfig, 'systemPromptAdditions'>> = {
    useThinking: true,
    reasoningEffort: 'high',
    maxSteps: 10,
};

// ============================================================
// MODEL SELECTION
// ============================================================

/**
 * Get the appropriate model based on configuration.
 */
function getModel(config: Required<Pick<AcademicAgentConfig, 'useThinking'>>): LanguageModel {
    if (!openrouter) {
        throw new Error('OpenRouter provider not available. Please configure OPENROUTER_API_KEY.');
    }

    if (config.useThinking) {
        // Use reasoning-capable free model
        return openrouter(Models.FREE.REASONING);
    }
    // Use standard tool-capable model
    return openrouter(Models.FREE.NVIDIA_3_NANO);
}

/**
 * Get provider options for thinking models.
 */
function getProviderOptions(config: Required<Pick<AcademicAgentConfig, 'useThinking' | 'reasoningEffort'>>) {
    if (!config.useThinking) {
        return undefined;
    }

    return {
        openrouter: {
            reasoning: {
                effort: config.reasoningEffort,
            },
        },
    };
}

// ============================================================
// SYSTEM PROMPT BUILDER
// ============================================================

/**
 * Build the full system prompt with project context.
 */
export function buildSystemPrompt(context: {
    topic: string;
    abstract: string | null;
    progress: string;
    chaptersText: string;
    researchText: string;
    threadTitle: string;
    additions?: string;
}): string {
    return `${MONJI_SYSTEM_PROMPT}

## COMMON ACADEMIC GUIDELINES
You must strictly adhere to the following rules for content generation, formatting, and structure:
${COMMON_ACADEMIC_RULES}

## Project Context
- **Topic:** ${context.topic}
- **Abstract:** ${context.abstract || 'Pending'}
- **Progress:** ${context.progress}

## Working Context (Thread: ${context.threadTitle})
${context.chaptersText}

## Research Library
${context.researchText}

## Instructions
1. You are a co-author and writing coach.
2. Use the provided Chapter content and Research Library to answer questions.
3. If the user asks for a revision, use the 'suggestEdit' tool.
4. Be concise but helpful.
5. When using the 'generateDiagram' tool, describe what the diagram should show in detail (nodes, relationships, flow). The system will generate the Mermaid code for you.
6. CRITICAL: When the user asks to "write", "draft", "create", or "generate" content for a chapter, you MUST use the 'generateSection' tool. Do NOT just write the text in the chat. The 'generateSection' tool is the ONLY way to save the content to the project database.
7. CRITICAL: When you use a tool (like listChapters, searchProjectDocuments), you MUST analyze the return value and provide a helpful natural language summary to the user. Do not stop after the tool runs. Explain what you found.
8. AUTONOMY RULE: If the user asks for a "Full Chapter" or "All Sections", do NOT stop to ask for confirmation after generating the outline. Proceed immediately to generating the sections.

${context.additions || ''}
`;
}

// ============================================================
// AGENT FACTORY
// ============================================================

/**
 * Create an academic agent with the specified configuration.
 * 
 * @example
 * ```typescript
 * // With default config
 * const agent = createAcademicAgent();
 * 
 * // With thinking model
 * const agent = createAcademicAgent({ useThinking: true });
 * 
 * // With custom steps
 * const agent = createAcademicAgent({ maxSteps: 15 });
 * ```
 */
export function createAcademicAgent(config: AcademicAgentConfig = {}) {
    const fullConfig = {
        ...DEFAULT_CONFIG,
        ...config,
    };

    const model = getModel(fullConfig);
    const providerOptions = getProviderOptions(fullConfig);

    return new ToolLoopAgent<AcademicAgentCallOptions, AcademicTools, any>({
        // Model configuration
        model,

        // Tools available to the agent
        tools: academicTools,

        // Stop after N steps (allows multi-step tool execution)
        stopWhen: stepCountIs(fullConfig.maxSteps),

        // Provider-specific options (for reasoning models)
        ...(providerOptions && { providerOptions }),

        // Map runtime call options to agent settings
        prepareCall: ({ options, ...settings }) => ({
            ...settings,
            instructions: options.instructions,
            experimental_context: options.experimental_context,
        }),
    });
}

// ============================================================
// DEFAULT AGENT INSTANCE
// ============================================================

/**
 * Default academic agent instance with thinking enabled.
 * Use this for most cases. Use `createAcademicAgent()` for custom configuration.
 */
export const academicAgent = createAcademicAgent({
    useThinking: true,
    reasoningEffort: 'high',
    maxSteps: 10,
});

// ============================================================
// TYPE EXPORTS
// ============================================================

/**
 * Infer the UI message type from the agent.
 * Use this in frontend components for full type safety.
 * 
 * @example
 * ```typescript
 * import type { AcademicUIMessage } from '@/lib/agents/academic-agent';
 * 
 * const { messages } = useChat<AcademicUIMessage>({ ... });
 * ```
 */
export type AcademicUIMessage = InferAgentUIMessage<typeof academicAgent>;

/**
 * Type for agent call options.
 */
export interface AcademicAgentCallOptions {
    /** System prompt to use */
    instructions: string;

    /** Execution context for tools */
    experimental_context?: AcademicExecutionContext;

    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;

    /** Timeout in milliseconds */
    timeout?: number;
}

// ============================================================
// AGENT METADATA
// ============================================================

export const academicAgentMeta = {
    name: 'academic-agent',
    description: 'Monji Academic Copilot - AI writing assistant for academic projects',
    version: '2.0.0',
    defaultMaxSteps: 10,
    supportsThinking: true,
    tools: Object.keys(academicTools) as (keyof AcademicTools)[],
};
