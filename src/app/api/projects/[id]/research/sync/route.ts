import { prisma } from "@/lib/prisma";
import { GeminiFileSearchService } from "@/lib/gemini-file-search";
import { NextResponse } from "next/server";

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
        const unsyncedDocs = project.documents.filter(d => !d.importedToFileSearch && d.fileData);
        const results = [];

        for (const doc of unsyncedDocs) {
            try {
                // Ensure we have mimeType and valid fileData
                if (!doc.mimeType || !doc.fileData) {
                    results.push({ id: doc.id, success: false, error: 'Missing file data or mime type' });
                    continue;
                }

                const uploadResult = await GeminiFileSearchService.uploadDocument(
                    storeId!,
                    doc.fileData,
                    doc.fileName,
                    doc.mimeType
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
