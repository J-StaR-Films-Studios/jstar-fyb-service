
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, convertInchesToTwip, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun } from "docx";

// Image cache to avoid re-fetching the same image
const imageCache = new Map<string, { data: ArrayBuffer; type: string; width: number; height: number }>();

/**
 * Converts MIME type to docx-compatible short format
 * docx library expects: 'jpg' | 'png' | 'gif' | 'bmp'
 */
const mimeToDocxType = (mimeType: string): 'jpg' | 'png' | 'gif' | 'bmp' => {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('gif')) return 'gif';
    if (mimeType.includes('bmp')) return 'bmp';
    // Default to jpg for jpeg, webp, and unknown types
    return 'jpg';
};

/**
 * Detects image MIME type from extension or Content-Type header
 */
const getImageType = (url: string, contentType?: string): string => {
    if (contentType && contentType.startsWith('image/')) {
        return contentType;
    }
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    switch (ext) {
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'bmp': return 'image/bmp';
        case 'svg': return 'image/svg+xml';
        case 'webp': return 'image/webp';
        case 'jpg':
        case 'jpeg':
        default: return 'image/jpeg';
    }
};

/**
 * Fetches image data from URL and returns buffer + metadata
 */
const fetchImageData = async (url: string): Promise<{ data: ArrayBuffer; type: string; width: number; height: number } | null> => {
    // Check cache first
    if (imageCache.has(url)) {
        return imageCache.get(url)!;
    }

    try {
        // Handle relative URLs (internal images)
        const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;

        const response = await fetch(fullUrl);
        if (!response.ok) {
            console.warn(`Failed to fetch image: ${url}`);
            return null;
        }

        const contentType = response.headers.get('Content-Type') || '';
        const data = await response.arrayBuffer();
        const type = getImageType(url, contentType);

        // Get image dimensions using a temporary image element
        const dimensions = await getImageDimensions(data, type);

        const result = { data, type, ...dimensions };
        imageCache.set(url, result);
        return result;
    } catch (error) {
        console.warn(`Error fetching image ${url}:`, error);
        return null;
    }
};

/**
 * Gets image dimensions from ArrayBuffer
 */
const getImageDimensions = (data: ArrayBuffer, type: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            // Default dimensions if we can't determine
            resolve({ width: 400, height: 300 });
        };

        img.src = url;
    });
};

/**
 * Creates an ImageRun paragraph from image data
 * Scales image to fit within page width while maintaining aspect ratio
 */
const createImageParagraph = async (
    url: string,
    altText: string,
    specifiedWidth?: number,
    specifiedHeight?: number
): Promise<Paragraph | null> => {
    const imageData = await fetchImageData(url);
    if (!imageData) return null;

    // Max width for document (roughly 6 inches = ~432 points = ~576 pixels at 96 DPI)
    const MAX_WIDTH = 500;
    const MAX_HEIGHT = 600;

    let width = specifiedWidth || imageData.width;
    let height = specifiedHeight || imageData.height;

    // Scale to fit within bounds while maintaining aspect ratio
    if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = Math.round(height * ratio);
    }
    if (height > MAX_HEIGHT) {
        const ratio = MAX_HEIGHT / height;
        height = MAX_HEIGHT;
        width = Math.round(width * ratio);
    }

    try {
        return new Paragraph({
            children: [
                new ImageRun({
                    data: imageData.data,
                    type: mimeToDocxType(imageData.type),
                    transformation: {
                        width,
                        height,
                    },
                    altText: {
                        title: altText || 'Image',
                        description: altText || 'Embedded image',
                        name: altText || 'image',
                    },
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
        });
    } catch (error) {
        console.warn(`Error creating image paragraph for ${url}:`, error);
        return null;
    }
};

/**
 * Parses markdown/HTML for image references
 * Returns array of { url, alt, width?, height? } or null if not an image line
 */
const parseImageLine = (line: string): { url: string; alt: string; width?: number; height?: number } | null => {
    const trimmed = line.trim();

    // Markdown image: ![alt](url) - standalone images on their own line
    const mdMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (mdMatch) {
        return { url: mdMatch[2], alt: mdMatch[1] || 'Image' };
    }

    // Also try matching if there's trailing content after the image
    const mdMatchLoose = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)/);
    if (mdMatchLoose && trimmed.startsWith('![')) {
        return { url: mdMatchLoose[2], alt: mdMatchLoose[1] || 'Image' };
    }

    // HTML img tag: <img src="url" alt="alt" width="w" height="h" />
    const imgMatch = trimmed.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/i);
    if (imgMatch) {
        const url = imgMatch[1];
        const altMatch = trimmed.match(/alt=["']([^"']*)["']/i);
        const widthMatch = trimmed.match(/width=["']?(\d+)["']?/i);
        const heightMatch = trimmed.match(/height=["']?(\d+)["']?/i);

        return {
            url,
            alt: altMatch?.[1] || 'Image',
            width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
            height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
        };
    }

    return null;
};

export interface ExportOptions {
    font?: string;
    fontSize?: number; // in pt
    lineSpacing?: number; // multiplier
    includeTitle?: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
    font: "Times New Roman",
    fontSize: 12,
    lineSpacing: 1.5,
    includeTitle: true
};

/**
 * Trigger a browser download for a given Blob and filename.
 */
export const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generate a Markdown Blob from content.
 */
export const generateMarkdownBlob = (content: string, title?: string): Blob => {
    const fullContent = title ? `# ${title} \n\n${content} ` : content;
    return new Blob([fullContent], { type: 'text/markdown' });
};

/**
 * Parses a single line of text for bold (**text**) and italic (*text*) markdown syntax.
 * Returns an array of TextRun objects.
 */
const parseLineToTextRuns = (text: string, options: ExportOptions): TextRun[] => {
    const runs: TextRun[] = [];
    let currentText = text;

    // Simple parser for bold (**...**) and italic (*...*)
    // This is a basic implementation; for nested or complex markdown, a full parser is needed.
    // We split by tokens.

    // Pattern matches **bold**, *italic*, or normal text
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = currentText.split(pattern);

    parts.forEach(part => {
        if (!part) return;

        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({
                text: part.slice(2, -2),
                bold: true,
                font: options.font,
                size: (options.fontSize || 12) * 2, // docx uses half-points
                color: "000000"
            }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({
                text: part.slice(1, -1),
                italics: true,
                font: options.font,
                size: (options.fontSize || 12) * 2,
                color: "000000"
            }));
        } else {
            runs.push(new TextRun({
                text: part,
                font: options.font,
                size: (options.fontSize || 12) * 2,
                color: "000000"
            }));
        }
    });

    return runs;
};

/**
 * Creates a docx Table from markdown table lines.
 */
const createTableFromMarkdown = (lines: string[], options: ExportOptions): Table => {
    // Parse headers
    const headerLine = lines[0];
    const headerCells = headerLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());

    // Parse alignment (if specific separator line exists)
    let alignments = new Array(headerCells.length).fill(AlignmentType.LEFT);
    let bodyStartIndex = 1;

    if (lines.length > 1 && lines[1].trim().startsWith('|') && lines[1].includes('-')) {
        const separatorLine = lines[1];
        const separatorCells = separatorLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());

        alignments = separatorCells.map(cell => {
            if (cell.startsWith(':') && cell.endsWith(':')) return AlignmentType.CENTER;
            if (cell.endsWith(':')) return AlignmentType.END;
            return AlignmentType.START;
        });
        bodyStartIndex = 2;
    }

    const rows: TableRow[] = [];

    // Header Row
    rows.push(new TableRow({
        tableHeader: true,
        children: headerCells.map((text, index) => new TableCell({
            children: [new Paragraph({
                alignment: alignments[index] || AlignmentType.START,
                children: [new TextRun({
                    text,
                    bold: true,
                    font: options.font,
                    size: (options.fontSize || 12) * 2,
                    color: "000000"
                })]
            })],
            shading: { fill: "F5F5F5" }, // Light gray background for headers
            verticalAlign: "center",
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            }
        }))
    }));

    // Body Rows
    for (let i = bodyStartIndex; i < lines.length; i++) {
        const cells = lines[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());

        // Ensure row has same number of cells as header (fill empty if missing)
        while (cells.length < headerCells.length) cells.push("");

        rows.push(new TableRow({
            children: cells.map((text, index) => new TableCell({
                children: [new Paragraph({
                    alignment: alignments[index] || AlignmentType.START,
                    children: parseLineToTextRuns(text, options) // Support bold/italic in cells
                })],
                verticalAlign: "center",
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                }
            }))
        }));
    }

    return new Table({
        rows: rows,
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        }
    });
};

/**
 * Generate a DOCX Blob from markdown content with configurable styles.
 */
export const generateDocxBlob = async (content: string, title?: string, userOptions?: ExportOptions): Promise<Blob> => {
    const options = { ...DEFAULT_OPTIONS, ...userOptions };

    // Pre-process content: 
    // 1. Replace em-dashes (—) with ", "
    // 2. Remove unnecessary backslashes escaping punctuation (e.g., \: -> :) and the specific artifact ":\" -> ":"
    const cleanedContent = content
        .replace(/—/g, ', ')
        .replace(/\\([:;,.!?])/g, '$1')   // Standard escape: \: -> :
        .replace(/:\\[\s]?/g, ': ')       // Artifact: :\ -> :
        .replace(/\\$/gm, '')             // Trailing backslashes at end of lines
        .replace(/\\\\/g, '\\');          // Double backslashes

    const lines = cleanedContent.split('\n');
    const children: (Paragraph | Table)[] = [];

    // Title
    if (title && options.includeTitle) {
        children.push(
            new Paragraph({
                children: [new TextRun({
                    text: title,
                    bold: true,
                    font: options.font,
                    size: ((options.fontSize || 12) + 6) * 2, // Title larger
                    color: "000000"
                })],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 }
            })
        );
    }

    let inList = false;
    let lastWasHeader = false;

    // Base options with 'Black' text enforcement
    const runStyle = {
        font: options.font,
        size: (options.fontSize || 12) * 2,
        color: "000000" // Always black
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            // Skip empty key "paragraphs" if they immediately follow a header
            // This prevents double spacing (margin-bottom + empty line)
            if (lastWasHeader) {
                lastWasHeader = false;
                continue;
            }
            children.push(new Paragraph({ text: "" }));
            inList = false;
            lastWasHeader = false;
            continue;
        }

        // Table Detection
        // Must start with | and end with | (ignoring whitespace) and have content
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
            const tableLines: string[] = [];
            // Look ahead to consume all table lines
            let j = i;
            while (j < lines.length) {
                const nextLine = lines[j].trim();
                // Check if it's still a table row
                // We allow the separator row | --- | to count as well
                if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
                    tableLines.push(nextLine);
                    j++;
                } else {
                    break;
                }
            }

            // Only process as table if we found valid syntax (at least 2 rows usually: header + separator)
            // But we'll accept 1 row tables too just in case
            if (tableLines.length > 0) {
                children.push(createTableFromMarkdown(tableLines, options));
                children.push(new Paragraph({ text: "" })); // Spacing after table

                // Fast forward loop
                i = j - 1;
                lastWasHeader = false;
                continue;
            }
        }

        // Image Detection (markdown ![alt](url) or HTML <img src="url" />)
        const imageInfo = parseImageLine(trimmed);
        if (imageInfo) {
            const imageParagraph = await createImageParagraph(
                imageInfo.url,
                imageInfo.alt,
                imageInfo.width,
                imageInfo.height
            );
            if (imageParagraph) {
                children.push(imageParagraph);
            } else {
                // Fallback: show image reference as text if fetch failed
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: `[Image: ${imageInfo.alt}]`,
                        italics: true,
                        ...runStyle,
                        color: "666666"
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 }
                }));
            }
            lastWasHeader = false;
            continue;
        }

        // Headers
        if (trimmed.startsWith('# ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(2),
                    bold: true,
                    ...runStyle,
                    size: ((options.fontSize || 12) + 4) * 2
                })],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER, // User requested Centered H1
                pageBreakBefore: true, // Force new page for each chapter
                spacing: { before: 240, after: 120 }
            }));
            lastWasHeader = true;
        } else if (trimmed.startsWith('## ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(3),
                    bold: true,
                    ...runStyle,
                    size: ((options.fontSize || 12) + 2) * 2
                })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.BOTH, // Justified
                spacing: { before: 240, after: 60 } // Reduced spacing from 120 to 60
            }));
            lastWasHeader = true;
        } else if (trimmed.startsWith('### ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(4),
                    bold: true,
                    ...runStyle,
                    size: (options.fontSize || 12) * 2
                })],
                heading: HeadingLevel.HEADING_3,
                alignment: AlignmentType.BOTH, // Justified
                spacing: { before: 240, after: 120 }
            }));
            lastWasHeader = true;
        } else if (trimmed.startsWith('#### ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(5),
                    bold: true,
                    ...runStyle,
                    size: (options.fontSize || 12) * 2
                })],
                heading: HeadingLevel.HEADING_4,
                alignment: AlignmentType.BOTH,
                spacing: { before: 200, after: 100 }
            }));
            lastWasHeader = true;
        } else if (trimmed.startsWith('##### ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(6),
                    bold: true,
                    ...runStyle,
                    size: (options.fontSize || 12) * 2
                })],
                heading: HeadingLevel.HEADING_5,
                alignment: AlignmentType.BOTH,
                spacing: { before: 160, after: 80 }
            }));
            lastWasHeader = true;
        } else if (trimmed.startsWith('###### ')) {
            children.push(new Paragraph({
                children: [new TextRun({
                    text: trimmed.substring(7),
                    bold: true,
                    italics: true, // Subtle distinction for H6
                    ...runStyle,
                    size: (options.fontSize || 12) * 2
                })],
                heading: HeadingLevel.HEADING_6,
                alignment: AlignmentType.BOTH,
                spacing: { before: 120, after: 60 }
            }));
            lastWasHeader = true;
        }
        // List items
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            children.push(new Paragraph({
                children: parseLineToTextRuns(trimmed.substring(2), options),
                bullet: {
                    level: 0
                },
                alignment: AlignmentType.BOTH, // Justified
                spacing: { before: 0, after: 0, line: (options.lineSpacing || 1.5) * 240 }
            }));
            lastWasHeader = false;
        }
        else if (/^\d+\.\s/.test(trimmed)) {
            inList = true;
            const text = trimmed.replace(/^\d+\.\s/, '');
            children.push(new Paragraph({
                children: parseLineToTextRuns(text, options),
                numbering: {
                    reference: "default-numbering",
                    level: 0
                },
                alignment: AlignmentType.BOTH, // Justified
                spacing: { before: 0, after: 0, line: (options.lineSpacing || 1.5) * 240 }
            }));
            lastWasHeader = false;
        }
        // Horizontal Rules
        else if (trimmed === '---' || trimmed === '***') {
            children.push(new Paragraph({
                border: {
                    bottom: { color: "000000", space: 1, style: "single", size: 6 }
                },
                spacing: { before: 120, after: 120 }
            }));
            lastWasHeader = false;
        }
        // Regular Paragraphs
        else {
            children.push(new Paragraph({
                children: parseLineToTextRuns(trimmed, options),
                spacing: { line: (options.lineSpacing || 1.5) * 240, before: 120, after: 120 },
                alignment: AlignmentType.BOTH // User requested Justified Body
            }));
            lastWasHeader = false;
        }
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: options.font,
                        size: (options.fontSize || 12) * 2,
                        color: "000000"
                    },
                    paragraph: {
                        spacing: { line: (options.lineSpacing || 1.5) * 240 },
                    },
                },
            },
        },
        numbering: {
            config: [
                {
                    reference: "default-numbering",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.DECIMAL,
                            text: "%1.",
                            alignment: AlignmentType.START,
                            style: {
                                paragraph: {
                                    indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.18) }, // Reduced indentation
                                },
                            },
                        },
                    ],
                },
            ],
        },
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return await Packer.toBlob(doc);
};

// Helper to sanitize filenames
export const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};
