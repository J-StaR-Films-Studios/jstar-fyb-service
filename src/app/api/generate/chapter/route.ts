import { streamText } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { BuilderAiService } from '@/features/builder/services/builderAiService';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { selectModel } from '@/lib/ai';
import { getChapterSpecificPrompt, COMMON_ACADEMIC_RULES } from '@/features/bot/prompts/chapterPrompts';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { assemble, execute, hash, writingSettings, PIPELINE_VERSION } from '@/lib/writing/pipeline';
import { publishRun } from '@/lib/writing/publish';

export const maxDuration = 300; // Increased duration for RAG


// Input validation schema
const requestSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    chapterNumber: z.number().min(1).max(5),
});

// Helper to parse sections from markdown
function parseSections(markdown: string) {
    const sections: { title: string; content: string; order: number }[] = [];
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

// Database saving helper
async function saveChapterToDb(projectId: string, chapterNumber: number, text: string) {
    const sections = parseSections(text);
    const wordCount = text.split(/\s+/).length;

    const existing = await prisma.chapter.findUnique({ where: { projectId_number: { projectId, number: chapterNumber } } });
    if (existing) {
        const updated = await prisma.chapter.updateMany({ where: { id: existing.id, version: existing.version, content: '' },
            data: { content: text, sections, wordCount, status: 'GENERATED', generatedAt: new Date() } });
        if (!updated.count) throw new Error('Chapter was edited while generation was running');
    } else {
        await prisma.chapter.create({ data: { projectId, number: chapterNumber, title: `Chapter ${chapterNumber}`,
            content: text, sections, wordCount, status: 'GENERATED', version: 1 } });
    }
    logger.info('Chapter saved successfully', '[GenerateChapter]');
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

        // 1b. Rate limiting
        const rateLimitResponse = await applyRateLimit(user.id, 'ai', { failClosed: true });
        if (rateLimitResponse) return rateLimitResponse;

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

        if (process.env.ACADEMIC_PIPELINE_ENABLED === 'true') {
            const snapshot = await assemble(projectId, { chapterNumber });
            const idempotencyKey = hash({ projectId, chapterNumber, snapshot });
            let run = await prisma.writingRun.findUnique({ where: { projectId_idempotencyKey: { projectId, idempotencyKey } } });
            if (!run) {
                try {
                    run = await prisma.writingRun.create({ data: { projectId, idempotencyKey,
                        requestHash: idempotencyKey, variant: 'full', chapterNumber, pipelineVersion: PIPELINE_VERSION,
                        settings: writingSettings(), snapshot, snapshotHash: hash(snapshot) } });
                } catch {
                    run = await prisma.writingRun.findUnique({ where: { projectId_idempotencyKey: { projectId, idempotencyKey } } });
                    if (!run) throw new Error('Could not create writing run');
                }
            }
            if (run.status === 'PENDING') {
                try { await execute(run.id); await publishRun(run.id); }
                catch { /* run keeps its failed stage for explicit resume */ }
            }
            const latest = await prisma.writingRun.findUniqueOrThrow({ where: { id: run.id } });
            const chapter = await prisma.chapter.findUnique({ where: { projectId_number: { projectId, number: chapterNumber } } });
            if (latest.status === 'FAILED') return Response.json({ error: 'Writing provider failed; resume the run', runId: run.id }, { status: 503 });
            const published = latest.published;
            if (!chapter || !published || typeof published !== 'object' || Array.isArray(published) || !published[chapterNumber])
                return Response.json({ error: 'Draft needs review before it can replace the saved chapter', runId: run.id, findings: latest.findings }, { status: 409 });
            return new Response(chapter.content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }

        const existingChapter = await prisma.chapter.findUnique({ where: { projectId_number: { projectId, number: chapterNumber } }, select: { content: true } });
        if (existingChapter?.content.trim())
            return Response.json({ error: 'Chapter has existing edits. Preserve it and use a writing run to compare a new draft.' }, { status: 409 });

        // 4. Use Builder AI service to generate chapter context string
        // This now includes injected summaries if available
        const aiGeneratedContext = await BuilderAiService.generateChapterContent(
            projectId,
            chapterNumber,
            `Chapter ${chapterNumber}`
        );

        // 4b. Format Project Outline for Context
        // This ensures the AI knows the global structure (what came before, what comes after)
        const outlineContext = project.outline?.content || 'No outline available.';

        // 4c. Fetch Neighboring Chapters for "Vibe" Continuity
        // We get the previous chapter (to flow from) and next chapter (to lead into)
        const [prevChapter, nextChapter] = await Promise.all([
            prisma.chapter.findFirst({
                where: { projectId, number: chapterNumber - 1 },
                select: { title: true, content: true }
            }),
            prisma.chapter.findFirst({
                where: { projectId, number: chapterNumber + 1 },
                select: { title: true, content: true }
            })
        ]);

        let neighborContext = "";
        if (prevChapter?.content) {
            neighborContext += `\nPREVIOUS CHAPTER (${chapterNumber - 1}: ${prevChapter.title}) ENDING:\n" ...${prevChapter.content.slice(-1500)} "\n`;
        }
        if (nextChapter?.content) {
            neighborContext += `\nNEXT CHAPTER (${chapterNumber + 1}: ${nextChapter.title}) BEGINNING:\n" ${nextChapter.content.slice(0, 1500)}... "\n`;
        }

        // 4d. Get Chapter Specific Rules
        const chapterRules = getChapterSpecificPrompt(chapterNumber, project.topic);

        // 5. DETERMINE MODE: Standard or Grounded
        // Grounded mode requires BOTH a file search store AND active documents
        const fileSearchStoreId = project.fileSearchStoreId;
        const hasDocuments = project.documents && project.documents.length > 0;
        const useGroundedParams = !!fileSearchStoreId && hasDocuments;

        logger.info(`Mode: ${useGroundedParams ? 'GROUNDED (Gemini)' : 'STANDARD (OpenRouter)'}`, '[GenerateChapter]');

        // ==========================================================
        // MODE A: STANDARD GENERATION (OpenRouter GPT-6 Luna)
        // ==========================================================
        if (!useGroundedParams) {
            const { model, modelId, provider, providerOptions } = selectModel({ quality: 'high' });
            logger.info(`Router selected: ${modelId} via ${provider}`, '[GenerateChapter]');

            const result = streamText({
                model,
                providerOptions,
                system: `You are an expert academic writer specializing in Final Year Project (FYP) documentation.
                
                ## COMMON ACADEMIC GUIDELINES
                ${COMMON_ACADEMIC_RULES}

                ## SPECIFIC CHAPTER INSTRUCTIONS
                ${chapterRules}

                ## PROJECT STRUCTURE (ROADMAP)
                ${outlineContext}

                ## NEIGHBORING CHAPTER CONTEXT (FLOW)
                Use this text to ensure smooth transitions between chapters:
                ${neighborContext || "No neighboring chapters written yet."}
                
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
        
        ## COMMON ACADEMIC GUIDELINES
        ${COMMON_ACADEMIC_RULES}

        ## SPECIFIC CHAPTER INSTRUCTIONS
        ${chapterRules}

        ## PROJECT STRUCTURE
        ${outlineContext}

        ## NEIGHBORING CHAPTER CONTEXT
        ${neighborContext || "No neighboring chapters written yet."}

        CONTEXT:
        ${aiGeneratedContext}

        INSTRUCTIONS:
        1. Use the "File Search" tool to verify facts and find specific citations.
        2. Integrate the provided research summaries (in CONTEXT) to synthesize arguments.
        3. Citation Style: APA 7th Edition (Author, Year).
        4. Length: Comprehensive (approx 1500-2000 words).
        5. Structure: Use standard academic headings (##, ###).
        6. Tone: Formal, objective, British English.
        
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

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of geminiStreamResult) {
                        const candidate = chunk.candidates?.[0];

                        // Manually extract text from parts to avoid SDK warnings about executableCode
                        // and to ensure we get all text content
                        if (candidate?.content?.parts) {
                            for (const part of candidate.content.parts) {
                                if (part.text) {
                                    fullText += part.text;
                                    controller.enqueue(encoder.encode(part.text));
                                }
                            }
                        }

                    }

                    // Grounding metadata has no dependable author/year or document-wide citation set.
                    // Never synthesize a bibliography from retrieved filenames.
                    if (fullText) await saveChapterToDb(projectId, chapterNumber, fullText);

                    controller.close();
                } catch (err) {
                    logger.error(err, '[GenerateChapter] Stream error');
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
        logger.error(error, '[GenerateChapter]');
        return new Response(
            JSON.stringify({ error: 'Failed to generate chapter' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

