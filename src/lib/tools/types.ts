/**
 * Context passed to all tool executions
 */
export interface ToolExecutionContext {
  /** The project ID */
  projectId: string;

  /** The active conversation/thread ID */
  conversationId: string | null;

  /** Current chapter context (if focused) */
  activeChapterNumber?: number;

  /** Pre-built chapter context text */
  chaptersText: string;

  /** User ID if authenticated */
  userId?: string;
}

/**
 * Factory function type to create context-aware tools
 */
export type ToolFactory<TOOLSET> = (
  context: ToolExecutionContext
) => TOOLSET;

/**
 * Standard success result wrapper
 */
export interface ToolSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard error result wrapper
 */
export interface ToolError {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * Union type for tool results
 */
export type ToolResult<T = unknown> = ToolSuccess<T> | ToolError;

/**
 * Helper to create success results
 */
export function toolSuccess<T>(data: T, message?: string): ToolSuccess<T> {
  return { success: true, data, message };
}

/**
 * Helper to create error results
 */
export function toolError(error: string, details?: unknown): ToolError {
  return { success: false, error, details };
}

/**
 * Categories of tools for organization
 */
export type ToolCategory =
  | 'research'     // Document search, grounding
  | 'content'      // Generate section, suggest edit
  | 'diagram'      // Generate diagrams
  | 'chapter'      // List, load, add chapters
  | 'context';     // Save user context, get guidelines

/**
 * Metadata for each tool
 */
export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  requiresContext?: boolean;
  mutations?: boolean;  // Does this tool modify data?
}
