import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateText } from 'ai'; // For hybrid generation
import { ChapterService } from '@/features/builder/services/chapterService';
import { ProjectContextService } from '@/features/builder/services/projectContextService';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { selectModel } from '@/lib/ai/router';
import { COMMON_ACADEMIC_RULES, getChapterSpecificPrompt } from '@/features/bot/prompts/chapterPrompts';

// Simple Mutex for Sequential Execution
class SimpleMutex {
    private promise = Promise.resolve();

    lock(): Promise<() => void> {
        let unlock: () => void;
        const next = new Promise<void>(resolve => unlock = resolve);
        const willLock = this.promise.then(() => unlock);
        this.promise = this.promise.then(() => next);
        return willLock;
    }
}

const sectionMutex = new SimpleMutex();

export const createAcademicTools = (
    projectId: string,
    activeConversationId: string | null,
    context: {
        chaptersText: string;
    }
) => {
    return {
        // --- Existing Tools ---

        searchProjectDocuments: tool({
            description: `Search the full text of uploaded research documents.`,
            inputSchema: z.object({
                query: z.string(),
            }),
            execute: async ({ query }: { query: string }) => {
                try {
                    const project = await prisma.project.findUnique({
                        where: { id: projectId },
                        select: { fileSearchStoreId: true }
                    });

                    if (!project?.fileSearchStoreId) {
                        return "I cannot search documents because no research library has been created for this project. Please upload documents first.";
                    }

                    const result = await GeminiFileSearchService.generateWithGrounding(
                        query,
                        [project.fileSearchStoreId]
                    );
                    return `[SYSTEM: execution complete] Found in documents:\n${result.text}\nSOURCES: ${JSON.stringify(result.groundingChunks)}\n\n[INSTRUCTION: Summarize these findings for the user.]`;
                } catch (error: any) {
                    console.error('[Chat Tool] Search failed:', error);
                    return `Search failed: ${error.message || 'Unknown error'}. Please ignore this tool result.`;
                }
            }
        }),

        suggestEdit: tool({
            description: `Suggest a specific content revision for a chapter or section. Use this when the user asks to "rewrite", "improve", "fix", or "change" specific text.`,
            inputSchema: z.object({
                chapterNumber: z.number().describe('The chapter number to edit'),
                currentContentToReplace: z.string().describe('The EXACT text snippet to be replaced (must match existing text)'),
                newContent: z.string().describe('The proposed new content'),
                explanation: z.string().describe('Brief reason for the change'),
            }),
            execute: async ({ chapterNumber, currentContentToReplace, newContent, explanation }: { chapterNumber: number; currentContentToReplace: string; newContent: string; explanation: string }) => {
                console.log(`[Chat API] Tool Executed: suggestEdit`, { chapterNumber, explanation });
                return {
                    tool: 'suggestEdit',
                    chapterNumber,
                    original: currentContentToReplace,
                    replacement: newContent,
                    explanation
                };
            }
        }),

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

        saveUserContext: tool({
            description: `Save user details like department, course, or institution.`,
            inputSchema: z.object({
                department: z.string().optional(),
                course: z.string().optional(),
                institution: z.string().optional(),
            }),
            execute: async (data: { department?: string; course?: string; institution?: string }) => {
                await prisma.project.update({
                    where: { id: projectId },
                    data: { ...data, contextComplete: true }
                });
                return "Context saved.";
            }
        }),

        getChapterGuidelines: tool({
            description: `Get the specific writing rules, structure, and constraints for a given chapter number. Use this if you need to know what sections are required or what is forbidden in a specific chapter.`,
            inputSchema: z.object({
                chapterNumber: z.number()
            }),
            execute: async ({ chapterNumber }) => {
                const rules = getChapterSpecificPrompt(chapterNumber, '');
                return `[SYSTEM: execution complete] Here are the rules for Chapter ${chapterNumber}:\n${rules}\n\n[INSTRUCTION: Use these rules to guide your advice or content generation.]`;
            }
        }),

        // --- New Chapter Management Tools ---

        listChapters: tool({
            description: `List all chapters in the current project to see their status and titles.`,
            inputSchema: z.object({}),
            execute: async () => {
                try {
                    const chapters = await ChapterService.getChapters(projectId);
                    if (chapters.length === 0) return "No chapters found. You can start by generating an outline.";
                    return `[SYSTEM: execution complete] Here is the list of chapters:\n${JSON.stringify(chapters, null, 2)}\n\n[INSTRUCTION: Present this list to the user in a readable format and ask if they would like to load or edit any specific chapter.]`;
                } catch (error: any) {
                    return `Failed to list chapters: ${error.message}`;
                }
            }
        }),

        loadChapter: tool({
            description: `Load the full content of a specific chapter into the context for reading or editing.`,
            inputSchema: z.object({
                chapterNumber: z.number()
            }),
            execute: async ({ chapterNumber }) => {
                try {
                    const chapter = await ChapterService.getChapter(projectId, chapterNumber);
                    if (!chapter) return `Chapter ${chapterNumber} does not exist.`;

                    // We don't return the full content to the chat context to avoid token limits,
                    // but we signal that it's loaded. In a real app, strict context management is needed.
                    // For now, we return a snippet and confirmation.
                    const preview = chapter.content ? chapter.content.slice(0, 500) + "..." : "(Empty)";
                    return `[SYSTEM: execution complete] Loaded Chapter ${chapterNumber}: ${chapter.title}\nStatus: ${chapter.status}\n\nPreview:\n${preview}\n\n[INSTRUCTION: Confirm to the user that the chapter is loaded and ready for editing. Ask what they would like to change.]`;
                } catch (error: any) {
                    return `Failed to load chapter: ${error.message}`;
                }
            }
        }),

        addChapter: tool({
            description: `Create a new chapter in the project.`,
            inputSchema: z.object({
                number: z.number(),
                title: z.string(),
                initialContent: z.string().optional()
            }),
            execute: async ({ number, title, initialContent }) => {
                try {
                    await ChapterService.createChapter(projectId, { number, title, content: initialContent });
                    return `[SYSTEM: execution complete] Chapter ${number}: "${title}" created successfully.\n\n[INSTRUCTION: Confirm the creation to the user.]`;
                } catch (error: any) {
                    return `Failed to create chapter: ${error.message}`;
                }
            }
        }),

        generateChapterOutline: tool({
            description: `Generate a suggested structure of chapters for the project based on the topic.`,
            inputSchema: z.object({
                focus: z.string().optional().describe('Specific focus area or methodology to emphasize')
            }),
            execute: async ({ focus }) => {
                try {
                    const outline = await ChapterService.generateOutline(projectId, {
                        topic: '', // Service will fetch from DB
                        focus
                    });
                    return `[SYSTEM: execution complete] Generated Outline:\n${JSON.stringify(outline, null, 2)}\n\n[INSTRUCTION: Present this outline. IF the user's original request was to "generate the full chapter" or "do it all", PROCEED IMMEDIATELY to calling 'generateSection' for each item in the outline. Do not stop to ask. Otherwise, ask for approval.]`;
                } catch (error: any) {
                    return `Failed to generate outline: ${error.message}`;
                }
            }
        }),

        generateSection: tool({
            description: `Generate or expand a specific section of text. Can be used in "Direct Mode" (saving your text) or "Agentic Mode" (generating text from instructions).`,
            inputSchema: z.object({
                chapterNumber: z.number(),
                sectionTitle: z.string(),
                content: z.string().optional().describe('Direct text content to save (Direct Mode)'),
                instructions: z.string().optional().describe('Instructions for AI to generate content (Agentic Mode)'),
                context: z.string().optional().describe('Additional context for generation')
            }),
            execute: async ({ chapterNumber, sectionTitle, content, instructions, context }) => {
                // ACQUIRE LOCK (The "Queue")
                // This ensures multiple calls wait for each other in line.
                const unlock = await sectionMutex.lock();

                try {
                    // Hybrid Logic
                    let finalContent = content;

                    if (!finalContent && instructions) {
                        // 1. Fetch Full Context (The "Brain Upgrade")
                        const [existingChapter, allChapters] = await Promise.all([
                            ChapterService.getChapter(projectId, chapterNumber),
                            ChapterService.getChapters(projectId)
                        ]);

                        const existingContent = existingChapter?.content || "";
                        const outlineContext = allChapters.map(c => `Chapter ${c.number}: ${c.title}`).join('\n');

                        // Agentic Mode: Generate content on the fly
                        console.log(`[Tool:Queue] Running generation for "${sectionTitle}"...`);
                        const { model } = selectModel({ quality: 'high' });
                        const result = await generateText({
                            model,
                            prompt: `
                            You are an expert academic writer.
                            Write a section titled "${sectionTitle}" for Chapter ${chapterNumber}.
                            
                            Instructions: ${instructions}
                            Context: ${context || 'None provided'}

                            ## FULL CHAPTER CONTEXT (So Far)
                            Below is the content written in this chapter. You must ensure your new section flows coherently with this text.
                            If the chapter is empty, start fresh. if text exists, transition smoothly.
                            
                            '''
                            ${existingContent}
                            '''

                            ## PROJECT STRUCTURE
                            ${outlineContext}

                            ## COMMON ACADEMIC GUIDELINES
                            ${COMMON_ACADEMIC_RULES}

                            ## SPECIFIC CHAPTER INSTRUCTIONS
                            ${getChapterSpecificPrompt(chapterNumber, '')}

                            ## UNIVERSAL ACADEMIC GUIDELINES (Deprecated placeholder, ensuring transition)
                            Keep it academic and professional.
                            `
                        });
                        finalContent = result.text;
                    }

                    if (!finalContent) {
                        return "Error: Please provide either 'content' (direct) or 'instructions' (for generation).";
                    }

                    // CRITICAL: Actually save to the database!
                    // First ensure the chapter exists or create it
                    let chapter = await ChapterService.getChapter(projectId, chapterNumber);
                    if (!chapter) {
                        // Create phantom chapter if missing
                        chapter = await ChapterService.createChapter(projectId, {
                            number: chapterNumber,
                            title: `Chapter ${chapterNumber}`,
                            content: ''
                        });
                    }

                    // Append or Update? For now, we append to the end if content exists, or just set it.
                    // A smarter way to try to place it, but appending is safe.
                    const newContent = chapter.content
                        ? `${chapter.content}\n\n${finalContent}`
                        : finalContent;

                    await ChapterService.updateChapterContent(projectId, chapterNumber, newContent);

                    // Return success + LATEST state so the Agent can "Read what's done"
                    return {
                        tool: 'generateSection',
                        status: 'success',
                        chapterNumber,
                        sectionTitle,
                        generatedContent: finalContent,
                        message: `Section "${sectionTitle}" generated AND SAVED to Chapter ${chapterNumber}. (Queue: Released)`
                    };

                } catch (error: any) {
                    return `Failed to generate section: ${error.message}`;
                } finally {
                    // RELEASE LOCK
                    unlock();
                }
            }
        })
    };
};
