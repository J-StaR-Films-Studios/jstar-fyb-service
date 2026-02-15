# Task: Create Academic Agent (ToolLoopAgent)

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 4 - Agent Creation  
**Priority:** P0 (Critical)  
**Dependencies:** 09_create_tool_registry.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Create the main `ToolLoopAgent` definition that will power the Monji Academic Copilot. This is the core of the refactored architecture - a reusable agent definition that can be used across the application with full type safety.

---

## 🎯 Scope

**In Scope:**
- Create `src/lib/agents/academic-agent.ts` with `ToolLoopAgent` definition
- Configure `stopWhen: stepCountIs(10)` for multi-step tool calling
- Include `prepareStep` for dynamic model selection (thinking vs non-thinking)
- Export `InferAgentUIMessage` type for frontend
- Create agent factory for dynamic model configuration
- Handle reasoning/thinking model configuration via `providerOptions`

**Out of Scope:**
- API route integration (next task)
- Frontend changes

---

## 📚 Context

### AI SDK v6 ToolLoopAgent Pattern

From the type definitions:
```typescript
declare class ToolLoopAgent<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never> implements Agent<CALL_OPTIONS, TOOLS, OUTPUT> {
  constructor(settings: ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>);
  
  generate(options: AgentCallParameters<CALL_OPTIONS>): Promise<GenerateTextResult<TOOLS, OUTPUT>>;
  stream(options: AgentStreamParameters<CALL_OPTIONS, TOOLS>): Promise<StreamTextResult<TOOLS, OUTPUT>>;
}
```

Key settings:
- `model`: The language model to use
- `instructions`: System prompt (was `system` in streamText)
- `tools`: Tool set
- `stopWhen`: Stopping conditions (default `stepCountIs(20)`)
- `prepareStep`: Dynamic configuration per step
- `providerOptions`: Provider-specific options (for reasoning models)
- `onFinish`: Callback when complete
- `onStepFinish`: Callback after each step

### Current System Prompt
The current system prompt from `chat/route.ts` includes:
- `MONJI_SYSTEM_PROMPT` - Base personality
- `COMMON_ACADEMIC_RULES` - Academic guidelines
- Project context (topic, abstract, progress)
- Chapter context
- Research library

---

## 🔧 Implementation

```typescript
// src/lib/agents/academic-agent.ts
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
import { openrouter } from '@/lib/ai/providers';
import { Models } from '@/lib/ai/providers';

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
  
  return new ToolLoopAgent({
    // Model configuration
    model,
    
    // Tools available to the agent
    tools: academicTools,
    
    // Stop after N steps (allows multi-step tool execution)
    stopWhen: stepCountIs(fullConfig.maxSteps),
    
    // Provider-specific options (for reasoning models)
    ...(providerOptions && { providerOptions }),
    
    // Note: 'instructions' is set dynamically via prepareCall or passed in generate/stream
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
  tools: Object.keys(academicTools),
};
```

---

## ✅ Definition of Done

- [ ] File `src/lib/agents/academic-agent.ts` created
- [ ] `createAcademicAgent` factory function created
- [ ] Default `academicAgent` instance created
- [ ] `stopWhen: stepCountIs(10)` configured
- [ ] `AcademicUIMessage` type exported via `InferAgentUIMessage`
- [ ] `AcademicExecutionContext` type defined
- [ ] `buildSystemPrompt` function created
- [ ] Thinking model `providerOptions` handled
- [ ] `prepareStep` considered (may not be needed with context pattern)
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/agents/academic-agent.ts` | Agent definition |
| `src/lib/agents/index.ts` | Re-exports |

---

## 🚫 Constraints

- Keep the agent definition pure - no database calls
- Context should be passed in, not fetched
- System prompt building should be a separate function
- Don't hardcode model IDs - use the existing provider constants

---

## 📝 Important Design Decisions

### 1. Factory Function vs Single Instance
We provide both:
- `createAcademicAgent(config)` - For custom configuration
- `academicAgent` - Default instance for most cases

### 2. Dynamic System Prompt
The `instructions` are passed at call time (via `generate` or `stream`), not at agent creation. This allows project-specific context.

### 3. Context Injection
Tool context is passed via `experimental_context` in the call options. The agent forwards this to each tool execution.

### 4. Thinking Model Support
`providerOptions` with `openrouter.reasoning.effort` is conditionally applied based on `useThinking` config.

---

*Generated by vibe-orchestrator mode*
