import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, invalid, validFactEvidence } from '@/lib/writing/api';

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  return Response.json({ facts: await prisma.projectFact.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } }) });
}
const schema = z.object({ kind: z.enum(['planned', 'completed', 'user_reported', 'artifact_backed', 'unknown', 'conflicting']),
  description: z.string().trim().min(1).max(2000), evidenceReference: z.string().min(1).optional() }).strict();
export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues);
  const { evidenceReference, kind, description } = parsed.data;
  if (!await validFactEvidence(id, kind, evidenceReference))
    return invalid('Evidence must belong to this project; artifact-backed facts require an uploaded document or data file');
  const fact = await prisma.projectFact.create({ data: { projectId: id, kind, description, evidenceReference } });
  return Response.json({ fact }, { status: 201 });
}
