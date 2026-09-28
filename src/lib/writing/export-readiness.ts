import { prisma } from '@/lib/prisma';
import { hashText, references, type Snapshot, type Stages } from './pipeline';
import type { Prisma } from '@prisma/client';

export function checkExport(run: { status: string; findings: Prisma.JsonValue; published: Prisma.JsonValue } | null,
  chapters: { number: number; content: string; version: number }[], abstract?: string | null) {
  if (!run || run.status !== 'COMPLETED') return { ready: false, reason: 'The latest full writing run still has unresolved findings or has not finished.' };
  if (Array.isArray(run.findings) && run.findings.length) return { ready: false, reason: 'Review writing and evidence findings first.' };
  const published = run.published;
  if (!published || typeof published !== 'object' || Array.isArray(published) || chapters.length !== 5 ||
    chapters.some(chapter => {
      const record = published[chapter.number];
      return !record || typeof record !== 'object' || Array.isArray(record) ||
        !('hash' in record) || record.hash !== hashText(chapter.content) ||
        !('version' in record) || record.version !== chapter.version;
    })) return { ready: false, reason: 'The saved document differs from the validated run. Preserve the edits and run validation again before submission export.' };
  if (abstract !== undefined) {
    const savedAbstract = published.abstract;
    if (!abstract?.trim() || !savedAbstract || typeof savedAbstract !== 'object' || Array.isArray(savedAbstract) ||
      !('hash' in savedAbstract) || savedAbstract.hash !== hashText(abstract))
      return { ready: false, reason: 'The abstract is missing or differs from the validated run.' };
  }
  return { ready: true };
}

export function checkBibliography(snapshot: Snapshot, stages: Stages,
  chapters: { number: number; content: string }[]) {
  if (!stages.final?.length) return false;
  const cited = references([stages.abstract ?? '', ...stages.final.map(output => output.text)].join('\n'), snapshot);
  if (cited.findings.some(finding => finding.severity === 'error')) return false;
  const expected = cited.lines.map(line => line.replace(/^\[SRC:[^\]]+\] /, ''));
  const last = chapters.find(chapter => chapter.number === 5)?.content ?? '';
  return expected.length ? last.endsWith(`## References\n\n${expected.join('\n')}`) : !/^## References\s*$/m.test(last);
}

export async function exportReadiness(projectId: string) {
  const [run, chapters, project] = await Promise.all([
    prisma.writingRun.findFirst({ where: { projectId, variant: 'full', chapterNumber: null }, orderBy: { createdAt: 'desc' } }),
    prisma.chapter.findMany({ where: { projectId }, select: { number: true, content: true, version: true } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { abstract: true } }),
  ]);
  const readiness = checkExport(run, chapters, project?.abstract);
  if (readiness.ready && run && !checkBibliography(run.snapshot as Snapshot, run.stages as Stages, chapters))
    return { ready: false, reason: 'The bibliography does not match the cited sources in the validated run.', runId: run.id };
  return { ...readiness, runId: run?.id };
}
