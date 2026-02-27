/**
 * Context Validation Utilities
 * 
 * Runtime type guards and validation for ToolExecutionContext.
 * Ensures tools receive properly typed context and fail gracefully if malformed.
 * 
 * @module lib/tools/context-validation
 */

import type { ToolExecutionContext } from './types';

const EXPECTED_CONTEXT_FIELDS = ['projectId', 'conversationId', 'chaptersText', 'activeChapterNumber', 'userId'];

/**
 * Result of successful context validation
 */
interface ContextValidationSuccess {
    success: true;
    data: ToolExecutionContext;
}

/**
 * Result of failed context validation
 */
interface ContextValidationFailure {
    success: false;
    error: string;
}

/**
 * Union type for context validation result
 */
export type ContextValidationResult = ContextValidationSuccess | ContextValidationFailure;

/**
 * Validates that the provided context matches ToolExecutionContext.
 * Returns the validated context or an error message.
 * 
 * @param context - The unknown context to validate
 * @returns Validation result with either data or error
 * 
 * @example
 * ```typescript
 * const result = validateToolContext(experimental_context);
 * if (!result.success) {
 *   return toolError(`Context error: ${result.error}`);
 * }
 * const { projectId } = result.data;
 * ```
 */
export function validateToolContext(context: unknown): ContextValidationResult {
    // Check if context exists and is an object
    if (!context || typeof context !== 'object') {
        return {
            success: false,
            error: 'Context is missing or not an object'
        };
    }

    const ctx = context as Record<string, unknown>;

    // Required field: projectId (must be non-empty string)
    if (typeof ctx.projectId !== 'string' || ctx.projectId.trim() === '') {
        return {
            success: false,
            error: 'projectId is required and must be a non-empty string'
        };
    }

    // Required field: conversationId (must be string or null)
    if (ctx.conversationId !== null && typeof ctx.conversationId !== 'string') {
        return {
            success: false,
            error: 'conversationId must be a string or null'
        };
    }

    // Required field: chaptersText (must be string)
    if (typeof ctx.chaptersText !== 'string') {
        return {
            success: false,
            error: 'chaptersText is required and must be a string'
        };
    }

    // Optional field: activeChapterNumber (must be number if provided)
    if (ctx.activeChapterNumber !== undefined && typeof ctx.activeChapterNumber !== 'number') {
        return {
            success: false,
            error: 'activeChapterNumber must be a number if provided'
        };
    }

    // Optional field: userId (must be string if provided)
    if (ctx.userId !== undefined && typeof ctx.userId !== 'string') {
        return {
            success: false,
            error: 'userId must be a string if provided'
        };
    }

    // Log warning for unexpected fields (but don't fail)
    const unexpectedFields = Object.keys(ctx).filter(key => !EXPECTED_CONTEXT_FIELDS.includes(key));
    if (unexpectedFields.length > 0) {
        console.warn('[validateToolContext] Unexpected fields in context:', unexpectedFields);
    }

    // Return validated context with proper typing
    return {
        success: true,
        data: {
            projectId: ctx.projectId,
            conversationId: ctx.conversationId as string | null,
            chaptersText: ctx.chaptersText as string,
            activeChapterNumber: ctx.activeChapterNumber as number | undefined,
            userId: ctx.userId as string | undefined,
        },
    };
}

/**
 * Type guard for ToolExecutionContext.
 * Use when you want a boolean check without error details.
 * 
 * @param context - The unknown context to check
 * @returns True if context is valid ToolExecutionContext
 * 
 * @example
 * ```typescript
 * if (isValidToolContext(experimental_context)) {
 *   // TypeScript knows experimental_context is ToolExecutionContext
 *   const { projectId } = experimental_context;
 * }
 * ```
 */
export function isValidToolContext(context: unknown): context is ToolExecutionContext {
    return validateToolContext(context).success;
}

/**
 * Helper to get validated context or throw.
 * Use when context is guaranteed to be valid (e.g., after API route construction).
 * 
 * @param context - The unknown context to validate
 * @returns The validated ToolExecutionContext
 * @throws Error if context is invalid
 * 
 * @example
 * ```typescript
 * try {
 *   const context = getValidatedContext(experimental_context);
 *   const { projectId } = context;
 * } catch (error) {
 *   // Handle invalid context
 * }
 * ```
 */
export function getValidatedContext(context: unknown): ToolExecutionContext {
    const result = validateToolContext(context);
    if (!result.success) {
        throw new Error(`Invalid tool context: ${result.error}`);
    }
    return result.data;
}
