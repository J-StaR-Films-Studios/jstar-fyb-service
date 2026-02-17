/**
 * Generate Diagram Tool
 * 
 * Tool for generating Mermaid.js diagrams from descriptions.
 * Creates flowcharts, sequence diagrams, mind maps, and other visual representations.
 * 
 * @module lib/tools/generate-diagram
 */

import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ToolResult, toolSuccess, toolError, type ToolExecutionContext } from './types';

/**
 * Supported diagram types
 */
const diagramTypes = ['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'mindmap'] as const;
type DiagramType = typeof diagramTypes[number];

/**
 * Input schema for generateDiagram tool
 */
const generateDiagramSchema = z.object({
    title: z.string()
        .describe('A short title for the diagram'),

    type: z.enum(diagramTypes)
        .describe('The type of diagram to generate (flowchart, sequence, class, state, er, gantt, or mindmap)'),

    description: z.string()
        .describe('Detailed description of what the diagram should show: nodes, relationships, flow direction, labels, and any specific structure requirements'),

    relevantContext: z.string()
        .optional()
        .describe('Any chapter or research content that provides context for this diagram'),

    explanation: z.string()
        .describe('Brief explanation of what the diagram represents and why it is relevant'),
});

/**
 * Output type for generateDiagram
 */
interface GenerateDiagramOutput {
    title: string;
    type: DiagramType;
    mermaidCode: string;
    explanation: string;
}

/**
 * Generate a Mermaid.js diagram based on a description.
 * The system will generate the actual Mermaid code from the description.
 * 
 * Use this when you need to visualize concepts, processes, relationships,
 * or structures from the project content.
 */
export const generateDiagramTool = tool({
    description: 'Generate a Mermaid.js diagram (flowchart, sequence, class, state, er, gantt, or mindmap). Describe what the diagram should show in detail - the system will generate the Mermaid code. Use this to visualize concepts, processes, or relationships.',

    inputSchema: generateDiagramSchema,

    execute: async ({ title, type, description, relevantContext, explanation }, { experimental_context }): Promise<ToolResult<GenerateDiagramOutput>> => {
        const executionContext = (experimental_context as ToolExecutionContext) || {};

        console.log('[generateDiagram] Tool executing:', {
            type,
            descriptionLength: description?.length
        });

        // Validate description
        if (!description || description.trim().length === 0) {
            return toolError('You must provide a detailed description of what the diagram should show.');
        }

        try {
            // Dynamic import to avoid circular dependencies
            const { generateDiagramCode } = await import('@/lib/ai/diagramService');

            // Use provided context or fall back to chapters text from context
            const projectContext = relevantContext || executionContext?.chaptersText?.slice(0, 2000) || '';

            const result = await generateDiagramCode({
                diagramType: type,
                description: description,
                projectContext,
            });

            return toolSuccess<GenerateDiagramOutput>({
                title: title || 'Untitled Diagram',
                type,
                mermaidCode: result.mermaidCode,
                explanation: explanation || result.explanation || '',
            });

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[generateDiagram] Error:', error);
            return toolError(`Failed to generate diagram: ${message}`, { error });
        }
    },
});

/**
 * Type for frontend component rendering
 */
export type GenerateDiagramInvocation = UIToolInvocation<typeof generateDiagramTool>;

/**
 * Tool metadata for documentation
 */
export const generateDiagramMeta = {
    name: 'generateDiagram',
    description: 'Generate Mermaid.js diagrams from descriptions',
    category: 'diagram' as const,
    requiresContext: true,
    mutations: false,
};
