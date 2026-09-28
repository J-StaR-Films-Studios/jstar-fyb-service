import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        const documents = await prisma.researchDocument.findMany({
            where: { projectId }, orderBy: { createdAt: 'desc' },
            select: { id: true, projectId: true, fileName: true, fileUrl: true, fileType: true,
                title: true, author: true, authors: true, year: true, summary: true, snippet: true,
                abstractText: true, sourceType: true, status: true, openAccessUrl: true,
                citationCount: true, venue: true, documentType: true, keywords: true, insights: true,
                importError: true, importedToFileSearch: true, createdAt: true, updatedAt: true }
        });

        return NextResponse.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error("[GetDocuments] Error:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}