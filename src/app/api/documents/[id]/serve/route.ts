import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validate ID format
        if (!id || (!/^c[a-z0-9]{24}$/i.test(id) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
            return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
        }

        // Get the document
        const doc = await prisma.researchDocument.findUnique({
            where: { id },
            select: {
                fileData: true,
                mimeType: true,
                fileName: true,
                fileType: true,
                fileUrl: true
            }
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Set appropriate headers
        const headers = new Headers();
        headers.set('Content-Type', doc.mimeType || 'application/octet-stream');
        // Force download behavior to prevent "opens in new tab" effectively, and ensure correct filename
        headers.set('Content-Disposition', `attachment; filename="${doc.fileName}"`);
        headers.set('Cache-Control', 'public, max-age=31536000');

        // Case A: Serve from DB (Binary)
        if (doc.fileData) {
            return new NextResponse(new Uint8Array(doc.fileData), { headers });
        }

        // Case B: Serve from URL (Proxy)
        // This fixes CORS issues and ensures correct filename references
        if (doc.fileUrl) {
            try {
                const externalRes = await fetch(doc.fileUrl);
                if (!externalRes.ok) throw new Error(`Failed to fetch external file: ${externalRes.statusText}`);

                // Forward the stream
                // @ts-ignore - ReadableStream is compatible
                return new NextResponse(externalRes.body, { headers });
            } catch (fetchError) {
                console.error("[ServeDocument] Proxy error:", fetchError);
                return NextResponse.json({ error: "Failed to retrieve external file" }, { status: 502 });
            }
        }

        return NextResponse.json({ error: "No file data available" }, { status: 400 });

    } catch (error) {
        console.error("[ServeDocument] Error:", error);
        return NextResponse.json({ error: "Failed to serve document" }, { status: 500 });
    }
}
