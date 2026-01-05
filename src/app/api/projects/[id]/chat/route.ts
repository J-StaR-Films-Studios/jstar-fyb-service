import { streamText, tool, stepCountIs, type CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { GeminiFileSearchService } from '@/lib/gemini-file-search';
import { MONJI_SYSTEM_PROMPT } from '@/features/bot/prompts/system';

export const maxDuration = 300;

// Validate environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}

// Create Gemini provider using the AI SDK
const google = createGoogleGenerativeAI({
    apiKey: geminiApiKey,
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const body = await req.json();
    const { messages, conversationId } = body;

    // 1. Fetch Project with enhanced context
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            outline: true,
            chapters: {
                select: { number: true, title: true, status: true, version: true }
            },
            documents: {
                where: { status: 'PROCESSED' },
                select: {
                    id: true,
                    title: true,
                    author: true,
                    year: true,
                    summary: true,
                    documentType: true
                }
            },
            // Fetch prior Jay onboarding messages if linked
            messages: {
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { role: true, content: true }
            }
        }
    });

    if (!project) {
        return new Response('Project not found', { status: 404 });
    }

    // 2. Resolve Conversation ID
    let activeConversationId = conversationId;
    if (!activeConversationId) {
        const conv = await prisma.projectConversation.create({
            data: { projectId }
        });
        activeConversationId = conv.id;
    }

    // 3. Prepare Enhanced Context
    const outlineData = project.outline?.content
        ? (typeof project.outline.content === 'string' ? project.outline.content : JSON.stringify(project.outline.content))
        : 'No outline available';

    // 3b. Prepare Research Context (Summaries)
    const researchContext = project.documents.length > 0
        ? project.documents.map(d =>
            `- [${d.documentType}] "${d.title}" by ${d.author || 'Unknown'} (${d.year || 'n.d'}): ${d.summary ? d.summary.substring(0, 200) + '...' : 'No summary'}`
        ).join('\n')
        : 'No research documents uploaded yet.';

    // 3c. Prepare Chapter Context (Status)
    const chapterContext = project.chapters.length > 0
        ? project.chapters.map(c => `- Chapter ${c.number}: ${c.title} (${c.status}, v${c.version})`).join('\n')
        : 'No chapters generated yet.';

    // 3d. Prepare Prior Jay Chat Summary (if available)
    const priorJayChatContext = project.jayContextSummary
        ? `\n## Prior Onboarding Context\n${project.jayContextSummary}\n`
        : (project.messages.length > 0
            ? `\n## Prior Onboarding Chat (Last 20 messages)\n${project.messages.reverse().map(m => `${m.role}: ${m.content}`).join('\n')}\n`
            : '');

    // 3e. User/Academic Context
    const userContext = [
        project.department ? `- **Department:** ${project.department}` : null,
        project.course ? `- **Course:** ${project.course}` : null,
        project.institution ? `- **Institution:** ${project.institution}` : null,
        project.complexity ? `- **Complexity Level:** ${project.complexity}/5` : null,
    ].filter(Boolean).join('\n') || '- No academic context available yet.';

    const systemPrompt = `${MONJI_SYSTEM_PROMPT}

## Project Context
- **Topic:** ${project.topic}
- **Twist:** ${project.twist || 'None'}
- **Abstract:** ${project.abstract || 'Not generated yet'}

## Student's Academic Context
${userContext}
${priorJayChatContext}
## Research Library (Summaries)
${researchContext}

## Current Progress
${chapterContext}

## Generated Outline
${outlineData}

## Additional Instructions
You are **NOT** a general assistant. You are specifically trained on THIS student's project. You should:
1. **Reference their specific topic and twist** when giving advice.
2. **Use the Research Library** for all writing suggestions to ensure grounded, accurate content.
3. **NEVER ask what their topic is** - you already know it from the context above.
4. For **RESEARCH QUESTIONS** (e.g., "What does my research say about X?"), use the "searchProjectDocuments" tool to find direct quotes.
5. Be conversational, encouraging, and maintain Nigerian academic standards.
6. If the user asks for content generation, base it on their outline structure.
7. **PROACTIVELY SAVE CONTEXT**: If the user mentions their department, course, or institution (e.g., "I'm a CS student at UNILAG"), IMMEDIATELY call the saveUserContext tool to save it - do NOT wait to be asked. After saving, acknowledge briefly (e.g., "Got it, I've noted you're in Computer Science at UNILAG!").

**IMPORTANT**: Always answer the user's question FIRST using the context you have. Missing fields like department or institution are nice-to-have but should NEVER block you from helping.
`;

    // 4. Stream Response
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error('[Academic Copilot API] Invalid messages array:', messages);
        return new Response(JSON.stringify({ error: 'Messages array is required and must not be empty' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Explicitly type messages for the AI SDK
    const coreMessages: CoreMessage[] = messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: typeof m.content === 'string' ? m.content : (m.parts?.find((p: any) => p.type === 'text')?.text || '')
    }));

    const result = streamText({
        model: google('gemini-2.5-flash'), // Gemini 2.5 Flash (stable)
        system: systemPrompt,
        messages: coreMessages,
        stopWhen: stepCountIs(5), // Allow tool usage steps
        tools: {
            searchProjectDocuments: tool({
                description: `Search the full text of uploaded research documents for specific information, quotes, or evidence. Use this when the user asks questions like "What does my research say about Y?" or "Find quotes about Z".`,
                inputSchema: z.object({
                    query: z.string().describe('The search query for the research library'),
                }),
                execute: async ({ query }: { query: string }) => {
                    try {
                        if (!project.fileSearchStoreId) return "No research library index found. Please upload documents first.";

                        const result = await GeminiFileSearchService.generateWithGrounding(
                            query,
                            [project.fileSearchStoreId]
                        );

                        // Format the grounded result for the chat model
                        return `Here is the information found in the documents:\n\n${result.text}\n\nSOURCES/CITATIONS:\n${JSON.stringify(result.groundingChunks)}`;
                    } catch (error: any) {
                        console.error('[Chat Tool] Search failed:', error);
                        return `Search failed: ${error.message}`;
                    }
                }
            }),
            saveUserContext: tool({
                description: `PROACTIVELY save user context whenever they mention their department, course code, or institution. Call this tool IMMEDIATELY when the user says things like "I'm in Computer Science", "I study at UNILAG", "my course is CSC 499", etc. Do NOT wait for them to ask you to save it - just save it automatically and briefly acknowledge.`,
                inputSchema: z.object({
                    department: z.string().optional().describe('e.g., Computer Science'),
                    course: z.string().optional().describe('e.g., CSC 499'),
                    institution: z.string().optional().describe('e.g., University of Lagos'),
                }),
                execute: async ({ department, course, institution }) => {
                    try {
                        const updateData: any = {};
                        if (department) updateData.department = department;
                        if (course) updateData.course = course;
                        if (institution) updateData.institution = institution;

                        if (Object.keys(updateData).length > 0) {
                            await prisma.project.update({
                                where: { id: projectId },
                                data: {
                                    ...updateData,
                                    contextComplete: !!(department && project.topic)
                                }
                            });
                            return `Context saved successfully: ${JSON.stringify(updateData)}`;
                        }
                        return 'No context to save';
                    } catch (error: any) {
                        console.error('[Chat Tool] Context save failed:', error);
                        return `Failed to save context: ${error.message}`;
                    }
                }
            })
        },
        onFinish: async ({ text }) => {
            // Save User Message (last one)
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === 'user') {
                const userContent = typeof lastUserMessage.content === 'string'
                    ? lastUserMessage.content
                    : (lastUserMessage.parts?.find((p: any) => p.type === 'text')?.text || '');
                await prisma.projectChatMessage.create({
                    data: {
                        conversationId: activeConversationId,
                        role: 'user',
                        content: userContent
                    }
                });
            }

            // Save Assistant Message
            await prisma.projectChatMessage.create({
                data: {
                    conversationId: activeConversationId,
                    role: 'assistant',
                    content: text
                }
            });
        },
    });

    return result.toUIMessageStreamResponse();
}

// DELETE: Clear project chat history
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;

        // Find and delete all project conversations and messages
        const conversations = await prisma.projectConversation.findMany({
            where: { projectId }
        });

        if (conversations.length > 0) {
            // Delete messages first, then conversations
            await prisma.projectChatMessage.deleteMany({
                where: {
                    conversationId: { in: conversations.map(c => c.id) }
                }
            });
            await prisma.projectConversation.deleteMany({
                where: { projectId }
            });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        console.error('[Project Chat DELETE] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear conversation' }), { status: 500 });
    }
}
