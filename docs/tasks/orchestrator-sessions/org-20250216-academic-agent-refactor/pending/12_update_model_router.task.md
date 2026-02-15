# Task: Update Model Router

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 5 - API Route Refactor  
**Priority:** P1  
**Dependencies:** 10_create_academic_agent.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Simplify and update the model router in `src/lib/ai/router.ts` to work cleanly with the new agent architecture. Remove redundant logic and ensure proper support for both thinking and non-thinking models.

---

## 🎯 Scope

**In Scope:**
- Review current router logic for redundancy
- Simplify reasoning + tools handling
- Ensure model IDs are current
- Add helper for agent model selection
- Update documentation

**Out of Scope:**
- Changing provider configuration
- Frontend changes

---

## 📚 Context

### Current Router Issues

From previous analysis:
1. The router has confusing logic when both `tools` and `reasoning` are true
2. Some code paths are redundant
3. Model IDs may be outdated

### Current Logic Flow
```
1. Force model override → use forced model
2. Grounding → Gemini (required)
3. Reasoning → OpenRouter free reasoning model
4. Tools → OpenRouter free tool model OR Gemini
5. Vision → OpenRouter vision model
6. Quality-based routing
```

### New Simplified Flow
With the agent architecture:
- Agent handles tool loop internally
- Router just needs to return the right model
- Thinking vs non-thinking is a simple flag

---

## 🔧 Implementation

```typescript
// src/lib/ai/router.ts (Updated)
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
  /** Does the request need file grounding? (requires native Gemini) */
  grounding?: boolean;
  
  /** Does the request require reasoning/chain-of-thought? */
  reasoning?: boolean;
  
  /** Quality tier preference */
  quality?: ModelQuality;
  
  /** Does the request process images? */
  vision?: boolean;
  
  /** Force a specific model ID (bypasses other logic) */
  forceModel?: string;
}

export interface RouteResult {
  /** The AI SDK model instance to use */
  model: any;
  
  /** Which provider was selected */
  provider: 'gemini' | 'openrouter' | 'groq';
  
  /** The model ID string */
  modelId: string;
  
  /** Is this a free tier model? */
  isFree: boolean;
  
  /** Reason for selection (for logging) */
  reason: string;
}

// ============================================================
// ROUTING LOGIC
// ============================================================

/**
 * Select the optimal model based on request configuration.
 * 
 * Simplified for ToolLoopAgent architecture.
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
      ? Models.FREE.NVIDIA_3_NANO 
      : Models.FREE.MIMO_V2_FLASH;
    
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
      model: groq!(Models.GROQ.KIMI_K2),
      provider: 'groq',
      modelId: Models.GROQ.KIMI_K2,
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
    return {
      model: openrouter!(forceModel),
      provider: 'openrouter',
      modelId: forceModel,
      isFree: true,
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
```

---

## ✅ Definition of Done

- [ ] Router simplified with clear rules
- [ ] Removed redundant `tools` routing (agent handles)
- [ ] All exports preserved for backward compatibility
- [ ] TypeScript compiles without errors
- [ ] Helper functions updated

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/ai/router.ts` | Updated router |

---

## 🚫 Constraints

- Don't break existing imports
- Keep the same function signatures
- Preserve backward compatibility

---

## 📝 Changes Summary

### Removed
- `tools` parameter from `RouteConfig` (agent handles tool loop)
- `getChatWithToolsModel()` function (not needed with agent)

### Simplified
- Reasoning + tools logic (no longer needs special handling)
- Routing flow is more linear

### Added
- `getReasoningModel()` helper
- `getVisionModel()` helper

---

*Generated by vibe-orchestrator mode*
