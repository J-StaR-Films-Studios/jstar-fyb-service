import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, invalid, validFactEvidence } from '@/lib/writing/api';

type Context = { params: Promise<{ id: string; factId: string }> };
export async function DELETE(_req: Request, { params }: Context) {
  const { id, factId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const result = await prisma.projectFact.deleteMany({ where: { id: factId, projectId: id } });
  return result.count ? Response.json({ deleted: true }) : Response.json({ error: 'Fact not found' }, { status: 404 });
}
export async function PATCH(req: Request, { params }: Context) {
  const { id, factId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = z.object({ kind: z.enum(['planned', 'completed', 'user_reported', 'artifact_backed', 'unknown', 'conflicting']),
    description: z.string().trim().min(1).max(2000), evidenceReference: z.string().min(1).nullable() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues);
  const { kind, description, evidenceReference } = parsed.data;
  if (!await validFactEvidence(id, kind, evidenceReference))
    return invalid('Evidence must belong to this project; artifact-backed facts require an uploaded document or data file');
  const updated = await prisma.projectFact.updateMany({ where: { id: factId, projectId: id }, data: { kind, description, evidenceReference } });
  if (!updated.count) return Response.json({ error: 'Fact not found' }, { status: 404 });
  return Response.json({ fact: await prisma.projectFact.findFirst({ where: { id: factId, projectId: id } }) });
}
