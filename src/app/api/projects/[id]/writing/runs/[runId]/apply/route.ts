import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { authorize } from '@/lib/writing/api';
import { hashText, references, renderCitations, validate, type Snapshot, type Stages } from '@/lib/writing/pipeline';

// Applying a draft is an explicit edit. Never replace content changed since its input snapshot.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const denied = await authorize(id); if (denied) return denied;
  const run = await prisma.writingRun.findFirst({ where: { projectId: id, id: runId } });
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  if (!['COMPLETED', 'NEEDS_REVIEW'].includes(run.status)) return Response.json({ error: 'No finished draft to apply' }, { status: 409 });
  const snapshot = run.snapshot as Snapshot;
  const stages = run.stages as Stages;
  const input = z.object({ chapterNumber: z.number().int().min(1).max(5).optional() }).strict()
    .safeParse(await req.json().catch(() => ({})));
  if (!input.success) return Response.json({ error: 'Invalid chapter number' }, { status: 400 });
  const output = stages.final?.find(item => item.number === (input.data.chapterNumber ?? stages.final?.[0]?.number));
  if (!output || output.section || (stages.final?.length !== 1 && !input.data.chapterNumber))
    return Response.json({ error: 'Select one chapter from the finished run' }, { status: 400 });
  if ((Array.isArray(run.findings) && run.findings.some(finding => finding && typeof finding === 'object' && !Array.isArray(finding) &&
        'severity' in finding && finding.severity === 'error' && (!('chapter' in finding) || finding.chapter === output.number))) ||
      validate(output.text, snapshot).some(finding => finding.severity === 'error') ||
      references(output.text, snapshot).findings.some(finding => finding.severity === 'error'))
    return Response.json({ error: 'Unresolved citation or evidence errors prevent applying this draft' }, { status: 409 });
  const expected = snapshot.chapters.find(chapter => chapter.number === output.number);
  const bibliography = references(stages.final?.map(item => item.text).join('\n') ?? '', snapshot).lines
    .map(line => line.replace(/^\[SRC:[^\]]+\] /, ''));
  const content = renderCitations(output.text, snapshot) +
    (!run.chapterNumber && output.number === 5 && bibliography.length ? `\n\n## References\n\n${bibliography.join('\n')}` : '');
  const updated = await prisma.$transaction(async tx => {
    const chapter = await tx.chapter.findUnique({ where: { projectId_number: { projectId: id, number: output.number } } });
    if (!chapter || !expected) return null;
    const prior = run.published && typeof run.published === 'object' && !Array.isArray(run.published)
      ? run.published[output.number] : null;
    const previouslyPublished = output.number === 5 && prior && typeof prior === 'object' && !Array.isArray(prior) &&
      'hash' in prior && prior.hash === hashText(chapter.content) && 'version' in prior && prior.version === chapter.version;
    if (!previouslyPublished && (chapter.version !== expected.version || hashText(chapter.content) !== expected.contentHash)) return null;
    const previousVersions = Array.isArray(chapter.previousVersions) ? chapter.previousVersions : [];
    const changed = await tx.chapter.updateMany({ where: { id: chapter.id, version: chapter.version, content: chapter.content },
      data: { content, version: { increment: 1 }, status: 'NEEDS_REVIEW',
        previousVersions: [...previousVersions, { version: chapter.version, content: chapter.content, createdAt: new Date().toISOString() }].slice(-10),
        wordCount: content.trim().split(/\s+/).length, lastEditedAt: new Date() } });
    if (!changed.count) return null;
    const current = await tx.writingRun.findUniqueOrThrow({ where: { id: runId } });
    const published = current.published && typeof current.published === 'object' && !Array.isArray(current.published)
      ? current.published : {};
    const findings = Array.isArray(current.findings) ? current.findings.filter(item =>
      !(item && typeof item === 'object' && !Array.isArray(item) &&
        'code' in item && item.code === 'EDIT_CONFLICT' && 'chapter' in item && item.chapter === output.number)) : [];
    await tx.writingRun.update({ where: { id: runId }, data: {
      published: { ...published, [output.number]: { version: chapter.version + 1, hash: hashText(content) } } as Prisma.InputJsonValue,
      findings: findings as Prisma.InputJsonValue, status: findings.length ? 'NEEDS_REVIEW' : 'COMPLETED' } });
    return { version: chapter.version + 1 };
  });
  if (!updated) return Response.json({ error: 'Chapter changed since the run started. Save your edits and generate a new draft.' }, { status: 409 });
  return Response.json({ applied: true, chapterNumber: output.number, ...updated });
}
