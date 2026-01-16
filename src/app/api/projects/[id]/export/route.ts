import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { diagrams, options } = await req.json(); // Map of { diagramId: base64String } and ExportOptions

    const project = await prisma.project.findUnique({
      where: { id },
      include: { chapters: { orderBy: { number: 'asc' } } }
    });

    if (!project) return new NextResponse('Project not found', { status: 404 });

    const docSections = [
      {
        children: [
          new Paragraph({
            text: project.topic,
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: 'Abstract',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: project.abstract || 'No abstract generated.',
            spacing: { after: 400 },
          }),
        ] as any[],
      },
    ];

    // Helper to process markdown and inject diagrams
    const processContent = (markdown: string): any[] => {
      const children: any[] = [];
      // Split by diagrams <mermaid-diagram ...>
      const parts = markdown.split(/(<mermaid-diagram[^>]*>)/g);

      parts.forEach(part => {
        if (part.startsWith('<mermaid-diagram')) {
          // Extract code or ID
          const codeMatch = part.match(/code="([^"]*)"/);
          const code = codeMatch ? codeMatch[1] : '';
          // Since we can't render code here, we look for matching image in request body
          // We need to match based on code content or an ID if we had one.
          // For now, let's assume the client sends a hash of the code or we matched by ID in the frontend.
          // BUT: The frontend logic I planned sends { diagramId: base64 }.
          // The extension currently stores 'code'.
          // IMPROVEMENT: The request body should probably be { [codeHash]: base64 } or we assume the frontend sends everything needed.

          // Let's assume the body contains a map keyed by the MERMAID CODE itself (as a simple key) or we generated IDs.
          // A safer bet is that the user sends a map of images, but we need to know WHICH image goes where.

          // SIMPLIFIED STRATEGY for this iteration:
          // Iterate all diagrams sent in body, if we find one, append it.
          // Wait, that puts them all at the end.

          // FIX: We need to know which diagram is which.
          // The `<mermaid-diagram>` tag has attributes. Let's use `code` to look up the image.

          // Simple key: First 50 chars of code or full code string.
          // The client will send { [code]: base64 }.

          const imageBase64 = diagrams[code];
          if (imageBase64) {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
            children.push(new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 600, height: 300 },
                  type: 'png',
                })
              ]
            }));
          } else {
            children.push(new Paragraph({
              text: '[DIAGRAM MISSING IN EXPORT]',
              style: 'Strong'
            }));
          }
        } else {
          // Normal text - stripped of markdown for now or simple paragraphs
          // A real implementation would parse markdown fully (Bold, headers etc).
          // For this task, we split by newlines.
          const lines = part.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              children.push(new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    font: options?.font || 'Times New Roman',
                    size: (options?.fontSize || 12) * 2, // docx uses half-points
                  })
                ],
                spacing: {
                  line: (options?.lineSpacing || 1.5) * 240, // 240 = 1 line
                  after: 200
                }
              }));
            }
          });
        }
      });

      return children;
    };

    project.chapters.forEach(chapter => {
      docSections[0].children.push(
        new Paragraph({
          text: `Chapter ${chapter.number}: ${chapter.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const contentNodes = processContent(chapter.content);
      docSections[0].children.push(...contentNodes);
    });

    const doc = new Document({
      sections: docSections,
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${project.topic.slice(0, 30)}.docx"`,
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export project' }, { status: 500 });
  }
}
