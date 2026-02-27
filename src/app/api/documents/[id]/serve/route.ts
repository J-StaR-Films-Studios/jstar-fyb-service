import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { validateUrlSecurity } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id || (!/^c[a-z0-9]{24}$/i.test(id) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
            return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
        }

        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const doc = await prisma.researchDocument.findUnique({
            where: { id },
            select: {
                fileData: true,
                mimeType: true,
                fileName: true,
                fileType: true,
                fileUrl: true,
                projectId: true,
                project: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const isOwner = doc.project.userId === session.user.id;
        const isAdmin = (session.user as { role?: string }).role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const headers = new Headers();
        headers.set('Content-Type', doc.mimeType || 'application/octet-stream');
        const safeFileName = encodeURIComponent(doc.fileName || 'document');
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
        headers.set('Cache-Control', 'public, max-age=31536000');

        if (doc.fileData) {
            return new NextResponse(new Uint8Array(doc.fileData), { headers });
        }

        if (doc.fileUrl) {
            try {
                await validateUrlSecurity(doc.fileUrl);
            } catch (securityError) {
                logger.error(`SSRF blocked for document ${id}: ${doc.fileUrl}`, "[ServeDocument]");
                return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
            }

            try {
                const externalRes = await fetch(doc.fileUrl);
                if (!externalRes.ok) throw new Error(`Failed to fetch external file: ${externalRes.statusText}`);

                return new NextResponse(externalRes.body, { headers });
            } catch (fetchError) {
                logger.error(`Proxy error for document ${id}`, "[ServeDocument]");
                return NextResponse.json({ error: "Failed to retrieve external file" }, { status: 502 });
            }
        }

        return NextResponse.json({ error: "No file data available" }, { status: 400 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error serving document: ${errorMessage}`, "[ServeDocument]");
        return NextResponse.json({ error: "Failed to serve document" }, { status: 500 });
    }
}
