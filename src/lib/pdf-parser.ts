/**
 * PDF Text Extraction Utility
 * Uses unpdf - a modern ESM-compatible PDF text extraction library
 */
import { extractText } from 'unpdf';

/**
 * Extract text content from a PDF buffer
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
    try {
        // Convert Buffer to Uint8Array as unpdf expects
        const uint8Array = new Uint8Array(buffer);

        const { text } = await extractText(uint8Array);
        // text is an array of strings (one per page), join them
        return Array.isArray(text) ? text.join('\n\n') : (text || '');
    } catch (error) {
        console.error('[PDF Parser] Extraction failed:', error);
        return '';
    }
}

/**
 * Get PDF metadata (page count, info, etc.)
 */
export async function getPdfMetadata(buffer: Buffer): Promise<{
    pages: number;
    info: Record<string, any>;
} | null> {
    try {
        const uint8Array = new Uint8Array(buffer);
        const { totalPages } = await extractText(uint8Array);
        return {
            pages: totalPages,
            info: {}
        };
    } catch (error) {
        console.error('[PDF Parser] Metadata extraction failed:', error);
        return null;
    }
}
