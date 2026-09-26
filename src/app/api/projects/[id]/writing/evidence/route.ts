import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/writing/api';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const documents = await prisma.researchDocument.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, authors: true, author: true, year: true, doi: true, sourceUrl: true,
      abstractText: true, snippet: true, summary: true, evidencePassage: true, evidenceLocation: true,
      materialLevel: true, verification: true, evidenceLimitations: true, sourceType: true,
      extractedContent: true, fileData: true } });
  return Response.json({ sources: documents.map(({ extractedContent, fileData, ...document }) => ({ ...document,
    availableArtifact: document.sourceType === 'USER_UPLOAD' && (!!fileData || !!extractedContent?.trim()),
    availableFullText: document.sourceType === 'USER_UPLOAD' && !!extractedContent?.trim() })) });
}
