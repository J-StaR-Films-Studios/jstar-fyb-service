import { NextRequest, NextResponse } from 'next/server';
import { openrouter, Models } from '@/lib/ai/providers';
import { generateText } from 'ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { prompt, diagramType, context } = await req.json();

    if (!openrouter) {
      return NextResponse.json(
        { error: 'OpenRouter not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert in Mermaid.js diagramming.
    Your task is to generate valid Mermaid.js code based on the user's description.

    GUIDELINES:
    1. Output MUST be valid Mermaid syntax.
    2. Do not include markdown code blocks (like \`\`\`mermaid). Just the raw code.
    3. If the user asks for a specific type (e.g. flowchart, sequence), strictly follow it.
    4. Use standard themes and simple syntax to ensure compatibility.
    5. Return ONLY a JSON object with the following structure:
    {
      "mermaidCode": "graph TD; A-->B;",
      "explanation": "A brief explanation of the diagram structure."
    }
    `;

    const userPrompt = `
    Diagram Type: ${diagramType || 'flowchart'}

    Description/Request:
    ${prompt}

    Additional Context:
    ${context || 'None'}
    `;

    const { text } = await generateText({
      model: openrouter(Models.FREE.MIMO_V2_FLASH), // Using a capable free model
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2, // Low temperature for deterministic code
    });

    // Attempt to parse JSON from the response
    let result;
    try {
        // Clean up potential markdown formatting if the model ignored instructions
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse diagram generation response:', text);
        return NextResponse.json(
            { error: 'Failed to generate valid diagram JSON', raw: text },
            { status: 500 }
        );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Diagram generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
