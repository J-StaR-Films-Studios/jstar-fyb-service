
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, convertInchesToTwip, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

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
