import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { applyRateLimit } from '@/lib/rate-limit';
import { authorize, invalid } from '@/lib/writing/api';
import { assemble, execute, hash, writingSettings, PIPELINE_VERSION, type Snapshot, type Stages } from '@/lib/writing/pipeline';
import { publishRun } from '@/lib/writing/publish';

export const maxDuration = 300;
const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  variant: z.enum(['baseline', 'context', 'editorial', 'full']),
  snapshotRunId: z.string().min(1).optional(),
  tonePreference: z.string().trim().max(500).optional(),
  scope: z.object({ chapterNumber: z.number().int().positive().optional(), section: z.string().trim().min(1).max(150).optional() }).strict().optional(),
}).strict();
type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const runs = await prisma.writingRun.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, variant: true, status: true, snapshotHash: true, metrics: true, createdAt: true, updatedAt: true } });
  return Response.json({ runs });
}

export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues);
  const input = parsed.data;
  const source = input.snapshotRunId ? await prisma.writingRun.findFirst({ where: { id: input.snapshotRunId, projectId: id } }) : null;
  if (input.snapshotRunId && !source) return invalid('Snapshot run not found');
  const sourceSnapshot = source?.snapshot as Snapshot | undefined;
  if (sourceSnapshot && input.scope && hash(input.scope) !== hash(sourceSnapshot.scope)) return invalid('Scope differs from snapshot');
  const scope = sourceSnapshot?.scope ?? input.scope ?? {};
  if (sourceSnapshot && input.tonePreference && input.tonePreference !== sourceSnapshot.tonePreference) return invalid('Tone differs from snapshot');
  const requestHash = hash({ variant: input.variant, scope, snapshotRunId: input.snapshotRunId ?? null, tonePreference: input.tonePreference ?? null });
  const key = { projectId_idempotencyKey: { projectId: id, idempotencyKey: input.idempotencyKey } };
  const existing = await prisma.writingRun.findUnique({ where: key });
  if (existing) {
    if (existing.requestHash !== requestHash) return Response.json({ error: 'Idempotency key already used for different input' }, { status: 409 });
    if (existing.status === 'PENDING') {
      const user = await getCurrentUser();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const limited = await applyRateLimit(user.id, 'ai', { failClosed: true }); if (limited) return limited;
      try { await execute(existing.id); await publishRun(existing.id); } catch { /* failed stages remain resumable */ }
      return Response.json({ run: await prisma.writingRun.findUniqueOrThrow({ where: { id: existing.id } }) });
    }
    return Response.json({ run: existing });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await applyRateLimit(user.id, 'ai', { failClosed: true }); if (limited) return limited;
  let snapshot;
  try { snapshot = sourceSnapshot ?? await assemble(id, scope, input.tonePreference); }
  catch (error) { if (error instanceof Error && ['Chapter not found', 'Section not found in chapter'].includes(error.message)) return invalid(error.message); throw error; }
  // For a fresh full run, re-review previously published text when it has not been edited.
  // Comparison variants with an explicit snapshotRunId always draft independently.
  const previous = !input.snapshotRunId && input.variant === 'full' && !scope.chapterNumber
    ? await prisma.writingRun.findFirst({ where: { projectId: id, variant: 'full', chapterNumber: null }, orderBy: { createdAt: 'desc' } }) : null;
  const previousStages = previous?.stages as Stages | undefined;
  const reuse = [];
  for (const chapter of snapshot.chapters) {
    const record = previous?.published && typeof previous.published === 'object' && !Array.isArray(previous.published)
      ? previous.published[chapter.number] : null;
    const old = previousStages?.final?.find(output => output.number === chapter.number);
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
      !('hash' in record) || record.hash !== chapter.contentHash || !old) break;
    reuse.push(old);
  }
  let run;
  try {
    run = await prisma.writingRun.create({ data: { projectId: id, idempotencyKey: input.idempotencyKey,
      requestHash, sourceRunId: input.snapshotRunId, chapterNumber: scope.chapterNumber,
      variant: input.variant, pipelineVersion: PIPELINE_VERSION, settings: writingSettings(),
      snapshot: snapshot, snapshotHash: hash(snapshot),
      ...(reuse.length ? { stages: { draft: reuse, reusedFromRunId: previous?.id } } : {}) } });
  } catch (error) {
    // A concurrent request may have won the unique-key race.
    const winner = await prisma.writingRun.findUnique({ where: key });
    if (!winner) throw error;
    return winner.requestHash === requestHash ? Response.json({ run: winner })
      : Response.json({ error: 'Idempotency key already used for different input' }, { status: 409 });
  }
  try { await execute(run.id); await publishRun(run.id); }
  catch { /* FAILED run retains stages and error for explicit resume */ }
  return Response.json({ run: await prisma.writingRun.findUniqueOrThrow({ where: { id: run.id } }) }, { status: 201 });
}
