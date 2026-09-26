import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function authorize(projectId: string, lookup?: {
  currentUser: () => Promise<{ id: string } | null>;
  projectOwner: (id: string) => Promise<string | null>;
}): Promise<Response | null> {
  if (process.env.ACADEMIC_PIPELINE_ENABLED !== 'true') return Response.json({ error: 'Writing pipeline is disabled' }, { status: 404 });
  const user = lookup ? await lookup.currentUser() : await getCurrentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const owner = lookup ? await lookup.projectOwner(projectId) :
    (await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } }))?.userId;
  if (!owner) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (owner !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
export const invalid = (details?: unknown) => Response.json({ error: 'Invalid input', details }, { status: 400 });
export async function validFactEvidence(projectId: string, kind: string, reference?: string | null) {
  if (kind === 'artifact_backed' && !reference) return false;
  if (!reference) return true;
  const document = await prisma.researchDocument.findFirst({ where: { id: reference, projectId },
    select: { sourceType: true, fileData: true, extractedContent: true } });
  return !!document && (kind !== 'artifact_backed' ||
    document.sourceType === 'USER_UPLOAD' && (!!document.fileData || !!document.extractedContent?.trim()));
}
