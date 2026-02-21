import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf-parser";

export const maxDuration = 120; // 2 minutes max for PDF fetch

interface FetchPdfResponse {
    success: boolean;
    message: string;
    hasFullText?: boolean;
    error?: string;
}

/**
 * POST /api/documents/[id]/fetch-pdf
 * 
 * Fetches a PDF from openAccessUrl for academic papers and stores it as fileData.
 * This enables full text extraction for richer AI context.
 * 
 * Common failure cases:
 * - Paywalls (403 Forbidden)
 * - CORS restrictions
 * - Invalid/expired URLs
 * - Rate limiting
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<FetchPdfResponse>> {
    try {
        const { id } = await params;

        // 1. Fetch the document
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
            }
        });

        if (!doc) {
            return NextResponse.json(
                { success: false, message: "Document not found" },
                { status: 404 }
            );
        }

        // 2. Check if already has file data
        if (doc.fileData) {
            return NextResponse.json({
                success: true,
                message: "Document already has PDF content",
                hasFullText: true
            });
        }

        // 3. Check for open access URL
        if (!doc.openAccessUrl) {
            return NextResponse.json(
                { success: false, message: "No open access PDF URL available for this document" },
                { status: 400 }
            );
        }

        // 4. Fetch the PDF
        console.log(`[FetchPDF] Attempting to fetch PDF for: ${doc.title}`);
        console.log(`[FetchPDF] URL: ${doc.openAccessUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        let response: Response;
        try {
            response = await fetch(doc.openAccessUrl, {
                signal: controller.signal,
                headers: {
                    // Some academic repositories require a user agent
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

            console.error('[FetchPDF] Network error:', fetchError);
            return NextResponse.json(
                { success: false, message: "Failed to connect to PDF source", error: "NETWORK_ERROR" },
                { status: 502 }
            );
        }

        clearTimeout(timeoutId);

        // 5. Check response status
        if (!response.ok) {
            const errorType = response.status === 403 ? "PAYWALL" :
                response.status === 404 ? "NOT_FOUND" :
                    response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR";

            console.error(`[FetchPDF] HTTP ${response.status} for ${doc.openAccessUrl}`);

            return NextResponse.json(
                {
                    success: false,
                    message: `PDF not accessible: ${response.status} ${response.statusText}`,
                    error: errorType
                },
                { status: response.status === 429 ? 429 : 403 }
            );
        }

        // 6. Verify content type - STRICT check to prevent saving HTML landing pages as PDFs
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
            console.error(`[FetchPDF] Invalid content type: ${contentType}`);
            return NextResponse.json(
                {
                    success: false,
                    message: `URL returned ${contentType}, not a PDF file.`,
                    error: "INVALID_CONTENT_TYPE"
                },
                { status: 400 }
            );
        }

        // 7. Get the PDF buffer
        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        // 8. Validate PDF size (max 50MB)
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

        // 9. Extract text from PDF
        let extractedText = "";
        try {
            extractedText = await extractPdfText(pdfBuffer);
        } catch (extractError) {
            console.error('[FetchPDF] Text extraction failed:', extractError);
            // Continue without extracted text - we still have the PDF
        }

        // 10. Save to database
        await prisma.researchDocument.update({
            where: { id },
            data: {
                fileData: pdfBuffer,
                mimeType: 'application/pdf',
                extractedContent: extractedText || null,
                status: 'UPLOADED', // Ready for processing
                // Keep the original filename but update fileType
                fileType: 'PDF',
            }
        });

        console.log(`[FetchPDF] Successfully saved PDF for: ${doc.title} (${pdfBuffer.length} bytes)`);

        return NextResponse.json({
            success: true,
            message: "PDF fetched and saved successfully",
            hasFullText: !!extractedText
        });

    } catch (error: unknown) {
        console.error("[FetchPDF] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch PDF";
        return NextResponse.json(
            { success: false, message, error: "INTERNAL_ERROR" },
            { status: 500 }
        );
    }
}
