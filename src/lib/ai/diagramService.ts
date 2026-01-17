import { generateText } from 'ai';
import { openrouter, gemini, Models } from '@/lib/ai/providers';

export interface GenerateDiagramParams {
    diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'mindmap';
    description: string;
    projectContext?: string;
}

export interface GenerateDiagramResult {
    mermaidCode: string;
    explanation: string;
}

/**
 * Generates Mermaid diagram code from a description.
 * This is used by both the chat tool (Monji) and the standalone DiagramGenerator.
 * Using a separate AI call ensures a fresh context window for accurate syntax.
 */
export async function generateDiagramCode(params: GenerateDiagramParams): Promise<GenerateDiagramResult> {
    const { diagramType, description, projectContext } = params;

    // Critical rules from Mermaid Diagrams.md for maximum compatibility
    const systemPrompt = `You are a Mermaid.js code generation expert. Your task is to generate clean, compatible, and error-free Mermaid.js code.

CRITICAL RULES (you MUST follow these):
1. **Use Universal Syntax:** Generate the most basic and universally compatible Mermaid.js syntax. DO NOT use advanced features like 'style', 'classDef', 'linkStyle', or '%%' comments unless explicitly requested.
2. **Quote All Complex Text:** ALWAYS enclose any node text in double quotes ("...") if it contains special characters like ( ) { } [ ], formatting like <br/>, or multiple lines. This prevents parsing errors.
3. **Infer Logical Flow:** If the user lists items in a specific order but doesn't define all connections, infer the logical sequence and connect them accordingly.
4. **Use Simple IDs:** Use short alphanumeric IDs (A, B, C or node1, node2) and put descriptive text in the label.
5. **Diagram Type:** ${diagramType} - use the appropriate syntax (flowchart TD, sequenceDiagram, classDiagram, etc.)

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "mermaidCode": "flowchart TD\\n  A[\\"Start\\"] --> B{\\"Decision?\\"}\\n  B -->|Yes| C[\\"Action 1\\"]\\n  B -->|No| D[\\"Action 2\\"]",
  "explanation": "A brief explanation of the diagram structure."
}`;

    const userPrompt = `
Diagram Type: ${diagramType}

Description/Request:
${description}

${projectContext ? `Relevant Project Context:\n${projectContext}` : ''}
`.trim();

    console.log('[DiagramService] Generating diagram:', { diagramType, descriptionLength: description.length });

    if (!openrouter) {
        throw new Error('OpenRouter provider not configured');
    }

    const { text } = await generateText({
        model: openrouter(Models.FREE.MIMO_V2_FLASH),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
    });

    // Parse JSON from response
    try {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedText);

        // Validate required fields
        if (!result.mermaidCode) {
            throw new Error('Missing mermaidCode in response');
        }

        console.log('[DiagramService] Generated successfully:', {
            codeLength: result.mermaidCode.length,
            hasExplanation: !!result.explanation
        });

        // Post-processing: Clean the code of any potential markdown formatting that got inside the string
        let cleanCode = result.mermaidCode;
        // Remove markdown code blocks if present in the string value
        cleanCode = cleanCode.replace(/^```mermaid\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

        return {
            mermaidCode: cleanCode,
            explanation: result.explanation || 'AI-generated diagram'
        };
    } catch (error) {
        console.error('[DiagramService] Generation failed:', error);
        throw error;
    }
}

/**
 * Generates Mermaid diagram code from an uploaded image (whiteboard, screenshot).
 * Uses Gemini Vision (multimodal) for accurate structure extraction.
 */
export async function generateDiagramFromImage(imageBase64: string, userHint?: string): Promise<GenerateDiagramResult> {
    if (!gemini) {
        throw new Error('Gemini provider is not configured. This feature requires a robust vision model.');
    }

    // Strip data URI prefix if present to get raw base64, usually SDK handles data URIs in 'image' part fine
    // But Vercel AI SDK expects a complete data URI string or URL for `image` part.
    // We will assume the input is a full data:image/... string.

    console.log('[DiagramService] Generating from image...', { hintLength: userHint?.length });

    try {
        const result = await generateText({
            model: gemini(Models.GEMINI_FLASH), // Excellent vision capabilities
            system: `You are a Mermaid.js Expert. 
            Analyze the provided image (chart, whiteboard sketch, or diagram) and convert it into valid Mermaid.js code.
            
            RULES:
            1. Extract the EXACT structure, nodes, and connections from the image.
            2. If text is illegible, infer logical labels based on context.
            3. Use the most appropriate diagram type (flowchart, sequence, etc.).
            4. Quote all node labels: A["Label"] --> B["Label"].
            5. Return JSON ONLY: { "mermaidCode": "...", "explanation": "..." }`,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userHint ? `Context/Hint: ${userHint}` : 'Convert this diagram to Mermaid.js code.' },
                        { type: 'image', image: imageBase64 }
                    ]
                }
            ]
        });

        // Parse JSON output
        const text = result.text.replace(/```json|```/g, '').trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) throw new Error('Invalid JSON format');

        return JSON.parse(text.substring(start, end + 1));

    } catch (error) {
        console.error('[DiagramService] Vision generation failed:', error);
        throw new Error('Failed to analyze image. Please ensure it is a clear diagram or sketch.');
    }
}
