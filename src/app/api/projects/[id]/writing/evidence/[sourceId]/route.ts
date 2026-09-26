import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, invalid } from '@/lib/writing/api';

const update = z.object({ title: z.string().trim().min(1).max(500).optional(),
  authors: z.string().trim().min(1).max(500).optional(), year: z.string().regex(/^\d{4}$/).optional(),
  doi: z.string().trim().max(250).optional(), sourceUrl: z.url().optional(),
  evidencePassage: z.string().max(3000).optional(), evidenceLocation: z.string().max(200).optional(),
  verification: z.enum(['USER_CONFIRMED', 'UNVERIFIED', 'CONFLICTING']).optional(),
  evidenceLimitations: z.string().max(1000).optional(), summary: z.string().max(1500).optional(),
}).strict();
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const { id, sourceId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = update.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return invalid(parsed.success ? 'No fields supplied' : parsed.error.issues);
  const changed = await prisma.researchDocument.updateMany({ where: { id: sourceId, projectId: id }, data: parsed.data });
  return changed.count ? Response.json({ updated: true }) : Response.json({ error: 'Source not found' }, { status: 404 });
}
