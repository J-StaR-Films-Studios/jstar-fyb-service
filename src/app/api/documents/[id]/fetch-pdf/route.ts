import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf-parser";
import { getSession } from "@/lib/auth-server";
import { validateUrlSecurity } from "@/lib/security";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

interface FetchPdfResponse {
    success: boolean;
    message: string;
    hasFullText?: boolean;
    error?: string;
}

const ALLOWED_ACADEMIC_DOMAINS = [
    'arxiv.org',
    'doi.org',
    'semanticscholar.org',
    'scholar.google.com',
    'researchgate.net',
    'academia.edu',
    'springer.com',
    'elsevier.com',
    'wiley.com',
    'nature.com',
    'science.org',
    'ieee.org',
    'acm.org',
    'jstor.org',
    'ncbi.nlm.nih.gov',
    'pmc.ncbi.nlm.nih.gov',
    'mdpi.com',
    'frontiersin.org',
    'plos.org',
];

function isAllowedAcademicUrl(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return ALLOWED_ACADEMIC_DOMAINS.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
        );
    } catch {
        return false;
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<FetchPdfResponse>> {
    try {
        const { id } = await params;

        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Authentication required" },
                { status: 401 }
            );
        }

        const doc = await prisma.researchDocument.findUnique({
            where: { id },
            select: {
                id: true,
                projectId: true,
                title: true,
                openAccessUrl: true,
                fileData: true,
                sourceType: true,
                fileType: true,
                project: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        if (!doc) {
            return NextResponse.json(
                { success: false, message: "Document not found" },
                { status: 404 }
            );
        }

        const isOwner = doc.project.userId === session.user.id;
        const isAdmin = (session.user as { role?: string }).role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            );
        }

        if (doc.fileData) {
            return NextResponse.json({
                success: true,
                message: "Document already has PDF content",
                hasFullText: true
            });
        }

        if (!doc.openAccessUrl) {
            return NextResponse.json(
                { success: false, message: "No open access PDF URL available for this document" },
                { status: 400 }
            );
        }

        try {
            await validateUrlSecurity(doc.openAccessUrl);
        } catch (securityError) {
            logger.error(`SSRF blocked for document ${id}: ${doc.openAccessUrl}`, "[FetchPDF]");
            return NextResponse.json(
                { success: false, message: "Invalid or blocked URL", error: "BLOCKED_URL" },
                { status: 400 }
            );
        }

        if (!isAllowedAcademicUrl(doc.openAccessUrl)) {
            logger.warn(`Non-allowlisted URL for document ${id}: ${doc.openAccessUrl}`, "[FetchPDF]");
        }

        logger.info(`Attempting to fetch PDF for: ${doc.title}`, "[FetchPDF]");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let response: Response;
        try {
            response = await fetch(doc.openAccessUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; JStarAcademicBot/1.0; +https://jstar.app/bot)',
                    'Accept': 'application/pdf,*/*',
                }
            });
        } catch (fetchError: unknown) {
            clearTimeout(timeoutId);

            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                return NextResponse.json(
                    { success: false, message: "PDF fetch timed out", error: "TIMEOUT" },
                    { status: 408 }
                );
            }

            logger.error(`Network error for document ${id}`, "[FetchPDF]");
            return NextResponse.json(
                { success: false, message: "Failed to connect to PDF source", error: "NETWORK_ERROR" },
                { status: 502 }
            );
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorType = response.status === 403 ? "PAYWALL" :
                response.status === 404 ? "NOT_FOUND" :
                    response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR";

            logger.error(`HTTP ${response.status} for ${doc.openAccessUrl}`, "[FetchPDF]");

            return NextResponse.json(
                {
                    success: false,
                    message: `PDF not accessible: ${response.status} ${response.statusText}`,
                    error: errorType
                },
                { status: response.status === 429 ? 429 : 403 }
            );
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
            logger.error(`Invalid content type: ${contentType}`, "[FetchPDF]");
            return NextResponse.json(
                {
                    success: false,
                    message: `URL returned ${contentType}, not a PDF file.`,
                    error: "INVALID_CONTENT_TYPE"
                },
                { status: 400 }
            );
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        const MAX_SIZE = 50 * 1024 * 1024;
        if (pdfBuffer.length > MAX_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    message: "PDF file too large (max 50MB)",
                    error: "FILE_TOO_LARGE"
                },
                { status: 413 }
            );
        }

        let extractedText = "";
        try {
            extractedText = await extractPdfText(pdfBuffer);
        } catch (extractError) {
            logger.error(`Text extraction failed for document ${id}`, "[FetchPDF]");
        }

        await prisma.researchDocument.update({
            where: { id },
            data: {
                fileData: pdfBuffer,
                mimeType: 'application/pdf',
                extractedContent: extractedText || null,
                status: 'UPLOADED',
                fileType: 'PDF',
            }
        });

        logger.info(`Successfully saved PDF for: ${doc.title} (${pdfBuffer.length} bytes)`, "[FetchPDF]");

        return NextResponse.json({
            success: true,
            message: "PDF fetched and saved successfully",
            hasFullText: !!extractedText
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch PDF";
        logger.error(`Error fetching PDF: ${message}`, "[FetchPDF]");
        return NextResponse.json(
            { success: false, message, error: "INTERNAL_ERROR" },
            { status: 500 }
        );
    }
}
