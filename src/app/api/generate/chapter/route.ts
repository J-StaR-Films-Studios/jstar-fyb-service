import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { BuilderAiService } from '@/features/builder/services/builderAiService';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';

// Validate environment variables
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqApiKey,
});

export const maxDuration = 300; // Increased duration for RAG

// Input validation schema
const requestSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    chapterNumber: z.number().min(1).max(5),
});

// Helper to parse sections from markdown
function parseSections(markdown: string) {
    const sections: any[] = [];
    const lines = markdown.split('\n');
    let currentSection: { title: string; content: string } | null = null;
    let order = 0;

    for (const line of lines) {
        if (line.match(/^##\s+/)) {
            // New section detected
            if (currentSection) {
                sections.push({ ...currentSection, order: order++ });
            }
            currentSection = {
                title: line.replace(/^##\s+/, '').trim(),
                content: ''
            };
        } else if (currentSection) {
            currentSection.content += line + '\n';
        } else {
            // Content before first section (intro text)
        }
    }

    // Push the last section
    if (currentSection) {
        sections.push({ ...currentSection, order: order++ });
    }

    return sections;
}

// Helper to build APA-style References section from grounding chunks
function buildReferencesSection(groundingChunks: any[]): string {
    if (!groundingChunks || groundingChunks.length === 0) return '';

    const seen = new Set<string>();
    const references: string[] = [];

    for (const chunk of groundingChunks) {
        const ctx = chunk.retrievedContext;
        if (!ctx) continue;

        // Extract title/filename and URI
        const title = ctx.title || ctx.displayName || 'Unknown Source';
        const uri = ctx.uri || '';

        // Avoid duplicates
        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        // Format as APA-style reference
        // Try to extract author/year from title if possible (e.g., "Smith2023_Paper.pdf")
        const match = title.match(/^([A-Za-z]+)(\d{4})/);
        if (match) {
            const author = match[1];
            const year = match[2];
            references.push(`- ${author}, (${year}). *${title}*.`);
        } else {
            references.push(`- *${title}*.`);
        }
    }

    if (references.length === 0) return '';

    return `## References\n\n${references.join('\n')}`;
}

// Database saving helper
async function saveChapterToDb(projectId: string, chapterNumber: number, text: string) {
    const sections = parseSections(text);
    const wordCount = text.split(/\s+/).length;

    try {
        await prisma.chapter.upsert({
            where: {
                projectId_number: {
                    projectId,
                    number: chapterNumber
                }
            },
            update: {
                content: text,
                sections: sections,
                wordCount,
                status: 'GENERATED',
                lastEditedAt: new Date(),
            },
            create: {
                projectId,
                number: chapterNumber,
                title: `Chapter ${chapterNumber}`,
                content: text,
                sections: sections,
                wordCount,
                status: 'GENERATED',
                version: 1,
            }
        });

        await prisma.project.update({
            where: { id: projectId },
            data: { updatedAt: new Date() }
        });
        console.log('[GenerateChapter] Chapter saved successfully');
    } catch (dbError) {
        console.error('[GenerateChapter] Failed to save chapter:', dbError);
    }
}

export async function POST(req: Request) {
    try {
        // 1. Authenticate user
        const user = await getCurrentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Parse and validate request
        const body = await req.json();
        const validation = requestSchema.safeParse(body);

        if (!validation.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid input', details: validation.error.issues }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { projectId, chapterNumber } = validation.data;

        // 3. Fetch project and verify ownership + unlock status
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                outline: true,
                documents: { select: { summary: true } } // Fetch summaries
            }
        });

        if (!project) {
            return new Response(JSON.stringify({ error: 'Project not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (project.userId !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Use Builder AI service to generate chapter context string
        // This now includes injected summaries if available
        const aiGeneratedContext = await BuilderAiService.generateChapterContent(
            projectId,
            chapterNumber,
            `Chapter ${chapterNumber}`
        );

        // 5. DETERMINE MODE: Standard or Grounded
        const fileSearchStoreId = project.fileSearchStoreId;
        const useGroundedParams = !!fileSearchStoreId;

        console.log(`[GenerateChapter] Mode: ${useGroundedParams ? 'GROUNDED (Gemini)' : 'STANDARD (Standard)'}`);

        // ==========================================================
        // MODE A: STANDARD GENERATION (Moonshot AI / Kimi)
        // ==========================================================
        if (!useGroundedParams) {
            const result = streamText({
                model: groq('moonshotai/kimi-k2-instruct-0905'), // Use specified model
                system: `You are an expert academic writer specializing in Final Year Project (FYP) documentation.
                
                STRICT ACADEMIC GUIDELINES:
                1. TONE: Formal, objective, and analytical.
                2. ENGLISH: Use British English (UK) spelling.
                3. CITATIONS: Use APA 7th Edition format where necessary.
                4. STRUCTURE: Use clear paragraphing.
                5. FORMATTING: Use Markdown.
                   - ## for Main Sections
                   - ### for Sub-sections
                   - **Bold** for key terms
                
                PROJECT CONTEXT & SUMMARIES:
                ${aiGeneratedContext}`,
                prompt: `Generate the full content for Chapter ${chapterNumber}. ensure it meets academic standards (approx 1500 words). Start directly with the first section heading.`,
                onFinish: async ({ text }) => {
                    await saveChapterToDb(projectId, chapterNumber, text);
                }
            });

            return result.toTextStreamResponse();
        }

        // ==========================================================
        // MODE B: GROUNDED GENERATION (Gemini Link)
        // ==========================================================

        // Construct prompt with summaries + instruction
        const prompt = `
        ROLE: Expert Academic Writer (PhD Level).
        TASK: Write Chapter ${chapterNumber} for a Final Year Project.
        
        CONTEXT:
        ${aiGeneratedContext}

        INSTRUCTIONS:
        1. Use the "File Search" tool to verify facts and find specific citations.
        2. Integrate the provided research summaries (in CONTEXT) to synthesize arguments.
        3. Citation Style: APA 7th Edition (Author, Year).
        4. Length: Comprehensive (approx 1500-2000 words).
        5. Structure: Use standard academic headings (##, ###).
        f. Tone: Formal, objective, British English.
        
        Start writing now.
        `;

        // Start Gemini Stream
        const geminiStreamResult = await GeminiFileSearchService.generateWithGroundingStream(
            prompt,
            [fileSearchStoreId],
            'gemini-2.5-flash' // Use specified model
        );

        // Transform Gemini Stream to Web Stream
        // We need to manually construct a ReadableStream that mimics the AI SDK format if possible,
        // or just return a standard text stream. The AI SDK `useChat` on frontend expects chunks.

        const encoder = new TextEncoder();
        let fullText = '';
        let groundingChunks: any[] = [];

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of geminiStreamResult) {
                        const chunkText = chunk.text;
                        if (chunkText) {
                            fullText += chunkText;
                            // Send text chunk similar to Vercel AI SDK format
                            controller.enqueue(encoder.encode(chunkText));
                        }

                        // Extract grounding metadata (typically in final chunk)
                        const candidates = (chunk as any).candidates;
                        if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                            groundingChunks = candidates[0].groundingMetadata.groundingChunks;
                        }
                    }

                    // Build References section from grounding chunks
                    let finalContent = fullText;
                    if (groundingChunks.length > 0) {
                        const references = buildReferencesSection(groundingChunks);
                        if (references) {
                            finalContent = fullText + '\n\n' + references;
                            // Stream the references section to client
                            controller.enqueue(encoder.encode('\n\n' + references));
                        }
                    }

                    // Save on completion with references included
                    if (finalContent) {
                        await saveChapterToDb(projectId, chapterNumber, finalContent);
                    }

                    controller.close();
                } catch (err) {
                    console.error('Stream error:', err);
                    controller.error(err);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1' // Hint compatibility if needed
            }
        });

    } catch (error: unknown) {
        console.error('[GenerateChapter] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to generate chapter' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

