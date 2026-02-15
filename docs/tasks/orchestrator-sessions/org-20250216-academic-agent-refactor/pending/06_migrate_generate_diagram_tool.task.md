# Task: Migrate generateDiagram Tool

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 3 - Tool Migration  
**Priority:** P1  
**Dependencies:** 03_create_base_types.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Migrate the `generateDiagram` tool from `src/lib/ai/academicTools.ts` to the new modular structure in `src/lib/tools/generate-diagram.ts`.

---

## 🎯 Scope

**In Scope:**
- Create new tool definition using AI SDK v6 patterns
- Use `inputSchema` (not deprecated `parameters`)
- Return clean data structures
- Export `UIToolInvocation` type for frontend
- Preserve exact functionality including dynamic import of diagramService

**Out of Scope:**
- Modifying the original file (yet)
- Frontend changes
- Agent integration

---

## 📚 Context

### Original Implementation (academicTools.ts lines 84-128)

```typescript
generateDiagram: tool({
    description: `Generate a Mermaidjs diagram (flowchart, sequence, class, etc). Describe what the diagram should show in detail - do not write the Mermaid code yourself, the system will generate it.`,
    inputSchema: z.object({
        title: z.string().describe('A short title for the diagram'),
        type: z.enum(['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'mindmap']).describe('The type of diagram to generate'),
        description: z.string().describe('Detailed description of what the diagram should show: nodes, relationships, flow direction, labels, and any specific structure requirements'),
        relevantContext: z.string().optional().describe('Any chapter or research content that provides context for this diagram'),
        explanation: z.string().describe('Brief explanation of what the diagram represents'),
    }),
    execute: async (args: any) => {
        console.log(`[Chat API] Tool Executing: generateDiagram (delegating to service)`, {
            type: args.type,
            descriptionLength: args.description?.length
        });

        const title = args.title || 'Untitled Diagram';
        const type = args.type || 'flowchart';
        const description = args.description || '';
        const explanation = args.explanation || '';

        if (!description) {
            return "ERROR: You must provide a detailed description of what the diagram should show.";
        }

        try {
            const { generateDiagramCode } = await import('@/lib/ai/diagramService');
            const result = await generateDiagramCode({
                diagramType: type,
                description: description,
                projectContext: args.relevantContext || context.chaptersText.slice(0, 2000),
            });

            return {
                tool: 'generateDiagram',
                title,
                type,
                mermaidCode: result.mermaidCode,
                explanation: explanation || result.explanation
            };
        } catch (error: any) {
            console.error('[Chat API] generateDiagram failed:', error);
            return `ERROR: Failed to generate diagram: ${error.message}.`;
        }
    }
}),
```

### Dependencies
- Dynamic import of `@/lib/ai/diagramService`
- `context.chaptersText` for project context
- `projectId` is NOT used directly in this tool

### Issues to Fix
1. ❌ Uses `args: any` - should be typed
2. ❌ Returns string error instead of structured error
3. ❌ Returns object with `tool` property (redundant)
4. ❌ No type export for frontend

---

## 🔧 New Implementation

```typescript
// src/lib/tools/generate-diagram.ts
import { tool, UIToolInvocation } from 'ai';
import { z } from 'zod';
import { ToolResult, toolSuccess, toolError } from './types';
import type { ToolExecutionContext } from './types';

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
  
  execute: async ({ title, type, description, relevantContext, explanation }, context): Promise<ToolResult<GenerateDiagramOutput>> => {
    const executionContext = context as ToolExecutionContext;
    
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
      
      // Use provided context or fall back to chapters text
      const projectContext = relevantContext || executionContext.chaptersText?.slice(0, 2000) || '';
      
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
```

---

## ✅ Definition of Done

- [ ] File `src/lib/tools/generate-diagram.ts` created
- [ ] Tool uses `inputSchema` (not `parameters`)
- [ ] Returns clean `ToolResult<GenerateDiagramOutput>` type
- [ ] Proper TypeScript types for all inputs
- [ ] `GenerateDiagramInvocation` type exported
- [ ] Tool metadata exported
- [ ] TypeScript compiles without errors
- [ ] Dynamic import preserved
- [ ] Context fallback handled properly

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/lib/tools/generate-diagram.ts` | Migrated tool |

---

## 🚫 Constraints

- Preserve dynamic import pattern
- Don't change diagram generation logic
- Keep logging
- Handle context gracefully when not provided

---

## 📝 Frontend Compatibility

The frontend `DiagramSuggestionCard` expects:
```typescript
{
  title: string;
  type: string;
  mermaidCode: string;
  explanation: string;
}
```

After migration, frontend will access via `part.output.data.*`

---

*Generated by vibe-orchestrator mode*
