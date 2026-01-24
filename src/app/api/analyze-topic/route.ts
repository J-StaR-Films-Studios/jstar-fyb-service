import { generateText } from 'ai';
import { z } from 'zod';
import { groq, Models } from '@/lib/ai/providers';
import { createGroq } from '@ai-sdk/groq';

// Lazy initialization of Groq provider
const getGroqProvider = () => {
    if (!process.env.GROQ_API_KEY && !groq) {
        throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    return groq || createGroq({ apiKey: process.env.GROQ_API_KEY || '' });
};

// Schema for input validation
const inputSchema = z.object({
    topic: z.string().min(3),
    department: z.string().min(2),
});

function sanitizeInput(text: string): string {
    if (!text) return "";
    // Strip HTML tags
    const noTags = text.replace(/<[^>]*>?/gm, '');
    // Limit length to prevent token exhaustion/DOS
    return noTags.slice(0, 500).trim();
}

// Schema for manual validation (not passed to model directly if not supported)
const analysisSchema = z.object({
    complexity: z.number().min(1).max(5),
    suggestedTwist: z.string(),
    category: z.enum(['HARD_TECH', 'WET_SCIENCE', 'SOCIAL_SCIENCE', 'ARTS', 'MANAGEMENT', 'OTHER']),
    notes: z.string(),
});

const ANALYSIS_PROMPT = `
You are a Final Year Project Consultant for Nigerian Universities.
Analyze the student's topic and department.

YOUR GOAL:
1. Determine the Complexity Score (1-5).
2. Generate a "Twist" - a modern, impressive angle (e.g., using AI, IoT, Case Study of a Tech Company).
3. Classify the Category.
4. Write brief notes on requirements.

GUIDELINES:
- HARD_TECH (CS/Eng): Twists should involve AI, Cloud, or Hardware.
- WET_SCIENCE (Bio/Med): Twists should involve Lab Analysis or Comparative Studies.
- SOCIAL_SCIENCE (Mass Comm/Biz): Twists should involve modern trends (Gen Z, Social Media, Fintech).

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this structure:
{
  "complexity": number (1-5),
  "suggestedTwist": "string",
  "category": "HARD_TECH" | "WET_SCIENCE" | "SOCIAL_SCIENCE" | "ARTS" | "MANAGEMENT",
  "notes": "string (max 20 words)"
}
NO preamble or markdown. Just valid JSON.
`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { topic, department } = inputSchema.parse(body);

        const safeTopic = sanitizeInput(topic);
        const safeDept = sanitizeInput(department);

        // Using generateText for maximum compatibility (some Groq models fail with generateObject/json_schema)
        const { text } = await generateText({
            model: getGroqProvider()(Models.GROQ.GPT_OSS_120B),
            system: ANALYSIS_PROMPT,
            prompt: `Department: ${safeDept}\nTopic: ${safeTopic}`,
            temperature: 0.5,
        });

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const data = JSON.parse(jsonMatch[0]);
        // Allow flexible category if model hallucinates slightly
        if (!data.category) data.category = 'OTHER';

        return Response.json(data);
    } catch (error) {
        console.error('AI Analysis Failed:', error);
        // Fallback response so the UI doesn't break
        return Response.json({
            complexity: 3,
            suggestedTwist: "Contact us for a custom AI-enhanced twist.",
            category: "OTHER",
            notes: "Analysis temporarily unavailable."
        });
    }
}
