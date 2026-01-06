import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { extractPdfText } from '@/lib/pdf-parser';
import mammoth from 'mammoth';

// Initialize Google Gemini client
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 300; // 5 minutes max for extraction

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch document with file data
        const doc = await prisma.researchDocument.findUnique({
            where: { id },
        });

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // 2. Try to get or extract text content
        let textToAnalyze = doc.extractedContent || "";

        // If no extracted content but we have file data, try to extract now
        if (!textToAnalyze && doc.fileData) {
            console.log(`[Extract] Re-extracting text for document: ${doc.fileName}`);

            const buffer = Buffer.from(doc.fileData);
            const mimeType = doc.mimeType || '';

            if (mimeType === 'application/pdf') {
                textToAnalyze = await extractPdfText(buffer);
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer });
                textToAnalyze = result.value || '';
            }

            // Save the extracted content for future use
            if (textToAnalyze) {
                await prisma.researchDocument.update({
                    where: { id },
                    data: { extractedContent: textToAnalyze }
                });
                console.log(`[Extract] Saved ${textToAnalyze.length} chars of extracted text`);
            }
        }

        if (!textToAnalyze) {
            await prisma.researchDocument.update({
                where: { id },
                data: { status: 'EXTRACTION_FAILED' }
            });
            return NextResponse.json({ error: 'Text extraction failed. The document may be empty or unreadable.' }, { status: 400 });
        }

        // 3. Run AI Analysis with Structured JSON Prompt
        const systemPrompt = `You are an expert AI research assistant. Analyze the provided research paper text and extract structured metadata.

Return ONLY a valid JSON object with the following fields. Do not include markdown formatting or explanations.

{
    "title": "Exact paper title",
    "authors": ["Author 1", "Author 2"],
    "year": "Publication Year (as string)",
    "objective": "Concise summary of the research objective",
    "motivation": "Concise summary of the motivation",
    "methodology": "Concise summary of the methodology",
    "contribution": "Concise summary of contributions",
    "limitations": "Concise summary of limitations",
    "documentType": "e.g. Journal Article, Conference Paper, etc.",
    "category": "Primary research topic/domain"
}`;

        const { text: jsonOutput } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: `Analyze the following research document content and extract metadata:\n\n${textToAnalyze.slice(0, 50000)}`
        });

        // Parse JSON output
        let metadata: any = {};
        try {
            // Remove markdown code blocks if present
            const cleanJson = jsonOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            metadata = JSON.parse(cleanJson);
        } catch (e) {
            console.error('[Extraction] Failed to parse JSON response:', e);
            // Fallback to storing raw text if JSON fails
            metadata = {
                title: "Error parsing metadata",
                objective: jsonOutput
            };
        }

        // 4. Save Structured Metadata
        const updatedDoc = await prisma.researchDocument.update({
            where: { id },
            data: {
                title: metadata.title || null,
                author: Array.isArray(metadata.authors) ? metadata.authors.join(', ') : (metadata.authors || null),
                year: metadata.year ? String(metadata.year) : null,
                objective: metadata.objective || null,
                motivation: metadata.motivation || null,
                methodology: metadata.methodology || null,
                contribution: metadata.contribution || null,
                limitations: metadata.limitations || null,
                documentType: metadata.documentType || null,
                category: metadata.category || null,
                summary: jsonOutput, // Store raw JSON/text in summary for backup
                status: 'PROCESSED',
                aiInsights: 'Structured metadata extracted via Gemini 2.5 Flash',
                processedAt: new Date()
            }
        });

        // 5. Auto-Trigger RAG Sync if missing
        // If the document hasn't been synced to Gemini File Search yet, do it now.
        if (!doc.importedToFileSearch && doc.fileData && updatedDoc.status === 'PROCESSED') {
            // We need the project to get the store ID
            const project = await prisma.project.findUnique({
                where: { id: doc.projectId },
                select: { fileSearchStoreId: true }
            });

            if (project?.fileSearchStoreId) {
                // Import the service dynamically to avoid circular deps if any (though importing normally is fine here)
                const { GeminiFileSearchService } = await import('@/lib/gemini-file-search');

                // Run sync in background (fire and forget from client perspective, or await if we want strictness)
                // Let's await it to ensure "Retry" button fixes everything in one go
                try {
                    const uploadResult = await GeminiFileSearchService.uploadDocument(
                        project.fileSearchStoreId,
                        doc.fileData,
                        doc.fileName,
                        doc.mimeType || 'application/pdf'
                    );

                    if (uploadResult.success) {
                        await prisma.researchDocument.update({
                            where: { id },
                            data: {
                                importedToFileSearch: true,
                                fileSearchFileId: uploadResult.fileId,
                                importError: null
                            }
                        });
                        console.log(`[Extract] Auto-synced document ${id} to RAG`);
                    } else {
                        await prisma.researchDocument.update({
                            where: { id },
                            data: { importError: uploadResult.error }
                        });
                    }
                } catch (syncError) {
                    console.error('[Extract] Auto-sync failed:', syncError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            extraction: {
                metadata: {
                    status: 'PROCESSED',
                    aiInsights: 'Metadata extracted',
                    data: metadata
                }
            }
        });

    } catch (error) {
        console.error('[Extraction] Error:', error);
        return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
    }
}
