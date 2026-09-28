import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, invalid } from '@/lib/writing/api';
import { hashText, type Stages } from '@/lib/writing/pipeline';

type Context = { params: Promise<{ id: string; runId: string }> };
const schema = z.object({
  detectorName: z.string().trim().min(1).max(100),
  detectorVersion: z.string().trim().max(100).optional(),
  measuredAt: z.string().datetime({ offset: true }),
  rawResult: z.union([z.record(z.string(), z.json()), z.array(z.json())]),
  testedTextHash: z.string().regex(/^[0-9a-f]{64}$/),
  testedVersion: z.literal('final'),
  limitations: z.string().max(1000).optional(),
}).strict();
export async function POST(req: Request, { params }: Context) {
  const { id, runId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues);
  const run = await prisma.writingRun.findFirst({ where: { id: runId, projectId: id }, select: { id: true, stages: true } });
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  const outputs = (run.stages as Stages).final;
  if (!outputs?.length) return invalid('Run has no final text');
  const expectedHash = hashText(outputs.map(output => output.text).join('\n\n'));
  if (expectedHash !== parsed.data.testedTextHash) return invalid('Tested text hash does not match this version');
  const { rawResult, ...metadata } = parsed.data;
  if (rawResult === undefined || JSON.stringify(rawResult).length > 16_000) return invalid('Raw result is missing or too large');
  const measurement = await prisma.detectorMeasurement.create({ data: {
    runId, ...metadata, rawResult, measuredAt: new Date(metadata.measuredAt),
  } });
  return Response.json({ measurement }, { status: 201 });
}
