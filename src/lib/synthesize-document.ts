/**
 * Synthesize a plain-text document from research metadata.
 * Used to upload metadata-only research documents to Gemini File Search
 * so they become searchable by the Academic Copilot.
 */
export function synthesizeDocumentText(doc: {
    title: string | null;
    authors?: string | null;
    year?: string | null;
    abstractText?: string | null;
    snippet?: string | null;
    sourceType: string;
    venue?: string | null;
    citationCount?: number | null;
    fileUrl?: string | null;
    openAccessUrl?: string | null;
}): Buffer {
    const lines: string[] = [];

    // Header
    lines.push(`Title: ${doc.title ?? 'Untitled Document'}`);
    lines.push(`Source Type: ${doc.sourceType}`);

    if (doc.authors) {
        lines.push(`Authors: ${doc.authors}`);
    }

    if (doc.year) {
        lines.push(`Year: ${doc.year}`);
    }

    if (doc.venue) {
        lines.push(`Venue: ${doc.venue}`);
    }

    if (doc.citationCount != null && doc.citationCount > 0) {
        lines.push(`Citations: ${doc.citationCount}`);
    }

    // Separator
    lines.push('');
    lines.push('---');
    lines.push('');

    // Content body
    if (doc.abstractText) {
        lines.push('Abstract:');
        lines.push(doc.abstractText);
        lines.push('');
    }

    if (doc.snippet) {
        lines.push('Summary:');
        lines.push(doc.snippet);
        lines.push('');
    }

    // URLs for reference
    if (doc.fileUrl) {
        lines.push(`Source URL: ${doc.fileUrl}`);
    }

    if (doc.openAccessUrl) {
        lines.push(`Open Access PDF: ${doc.openAccessUrl}`);
    }

    const text = lines.join('\n');
    return Buffer.from(text, 'utf-8');
}
