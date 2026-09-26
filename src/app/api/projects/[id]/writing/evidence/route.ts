import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/writing/api';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const [documents, availability] = await Promise.all([
    prisma.researchDocument.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, authors: true, author: true, year: true, doi: true, sourceUrl: true,
        abstractText: true, snippet: true, summary: true, evidencePassage: true, evidenceLocation: true,
        materialLevel: true, verification: true, evidenceLimitations: true, sourceType: true } }),
    prisma.$queryRaw<{ id: string; availableArtifact: boolean; availableFullText: boolean }[]>`
      SELECT "id", "sourceType" = 'USER_UPLOAD' AND
        ("fileData" IS NOT NULL OR COALESCE("extractedContent" ~ '[^[:space:]]', false)) AS "availableArtifact",
        "sourceType" = 'USER_UPLOAD' AND COALESCE("extractedContent" ~ '[^[:space:]]', false) AS "availableFullText"
      FROM "ResearchDocument" WHERE "projectId" = ${id}`,
  ]);
  const byId = new Map(availability.map(item => [item.id, item]));
  return Response.json({ sources: documents.map(document => ({ ...document,
    availableArtifact: byId.get(document.id)?.availableArtifact ?? false,
    availableFullText: byId.get(document.id)?.availableFullText ?? false })) });
}
