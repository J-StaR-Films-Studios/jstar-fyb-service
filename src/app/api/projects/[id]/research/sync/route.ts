import { prisma } from "@/lib/prisma";
import { GeminiFileSearchService } from "@/lib/gemini-file-search";
import { NextResponse } from "next/server";
import { synthesizeDocumentText } from "@/lib/synthesize-document";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        // 1. Get Project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { documents: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // 2. Ensure File Search Store exists
        let storeId = project.fileSearchStoreId;
        if (!storeId) {
            storeId = await GeminiFileSearchService.createStore(projectId);
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    fileSearchStoreId: storeId,
                    fileSearchStoreCreatedAt: new Date()
                }
            });
        }

        // 3. Sync unsynced documents
        // Include BOTH binary docs (user uploads) AND metadata-only docs (deep research)
        const unsyncedDocs = project.documents.filter(d =>
            !d.importedToFileSearch && (d.fileData || d.abstractText || d.snippet)
        );
        const results = [];

        for (const doc of unsyncedDocs) {
            try {
                let fileBuffer: Buffer;
                let mimeType: string;
                let fileName: string;

                if (doc.fileData) {
                    // Binary document (user upload) — use original file data
                    if (!doc.mimeType) {
                        results.push({ id: doc.id, success: false, error: 'Missing mime type' });
                        continue;
                    }
                    fileBuffer = doc.fileData;
                    mimeType = doc.mimeType;
                    fileName = doc.fileName;
                } else {
                    // Metadata-only document (deep research) — synthesize text
                    fileBuffer = synthesizeDocumentText(doc);
                    mimeType = 'text/plain';
                    fileName = `${doc.title || doc.fileName} (Research Metadata).txt`;
                }

                const uploadResult = await GeminiFileSearchService.uploadDocument(
                    storeId!,
                    fileBuffer,
                    fileName,
                    mimeType
                );

                if (uploadResult.success) {
                    await prisma.researchDocument.update({
                        where: { id: doc.id },
                        data: {
                            importedToFileSearch: true,
                            fileSearchFileId: uploadResult.fileId,
                            importError: null
                        }
                    });
                    results.push({ id: doc.id, success: true });
                } else {
                    await prisma.researchDocument.update({
                        where: { id: doc.id },
                        data: { importError: uploadResult.error }
                    });
                    results.push({ id: doc.id, success: false, error: uploadResult.error });
                }

            } catch (error: any) {
                results.push({ id: doc.id, success: false, error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            total: unsyncedDocs.length,
            results
        });

    } catch (error: any) {
        console.error('[ResearchSync] Error:', error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
