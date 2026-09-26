import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { applyRateLimit } from '@/lib/rate-limit';
import { authorize, invalid } from '@/lib/writing/api';
import { execute } from '@/lib/writing/pipeline';
import { publishRun } from '@/lib/writing/publish';

export const maxDuration = 300;
type Context = { params: Promise<{ id: string; runId: string }> };
export async function GET(_req: Request, { params }: Context) {
  const { id, runId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const run = await prisma.writingRun.findFirst({ where: { id: runId, projectId: id }, include: { measurements: true } });
  return run ? Response.json({ run }) : Response.json({ error: 'Run not found' }, { status: 404 });
}
export async function PATCH(req: Request, { params }: Context) {
  const { id, runId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = z.object({ action: z.enum(['resume', 'cancel']) }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues);
  const run = await prisma.writingRun.findFirst({ where: { id: runId, projectId: id } });
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  if (parsed.data.action === 'cancel') {
    const running = await prisma.writingRun.updateMany({ where: { id: runId, projectId: id, status: 'RUNNING' },
      data: { status: 'CANCEL_REQUESTED' } });
    const idle = running.count ? running : await prisma.writingRun.updateMany({ where: { id: runId, projectId: id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'CANCELLED' } });
    if (!idle.count) return Response.json({ error: 'Run cannot be cancelled' }, { status: 409 });
  } else {
    if (!['PENDING', 'FAILED', 'COMPLETED', 'NEEDS_REVIEW'].includes(run.status) && !(run.status === 'RUNNING' && run.updatedAt < new Date(Date.now() - 10 * 60_000)))
      return Response.json({ error: 'Only pending, failed, finished-unpublished or stale runs can resume' }, { status: 409 });
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const limited = await applyRateLimit(user.id, 'ai', { failClosed: true }); if (limited) return limited;
    try { if (run.status === 'PENDING' || run.status === 'FAILED' || run.status === 'RUNNING') await execute(runId);
      await publishRun(runId);
    } catch { /* retain the run and stages for retry */ }
  }
  return Response.json({ run: await prisma.writingRun.findFirstOrThrow({ where: { id: runId, projectId: id } }) });
}
