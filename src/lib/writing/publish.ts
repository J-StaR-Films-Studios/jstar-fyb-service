import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashText, references, renderCitations, validate, type Finding, type Output, type Snapshot, type Stages } from './pipeline';

// The generated draft is never allowed to replace existing editor content. A retry is idempotent.
export async function publishRun(runId: string, db: typeof prisma = prisma) {
  const run = await db.writingRun.findUniqueOrThrow({ where: { id: runId } });
  if (run.variant !== 'full' || !['COMPLETED', 'NEEDS_REVIEW'].includes(run.status)) return;
  const snapshot = run.snapshot as Snapshot;
  const stages = run.stages as Stages;
  if (!stages.final?.length) return;
  const findings: Finding[] = Array.isArray(run.findings) ? run.findings as Finding[] : [];
  const published: Record<string, { hash: string; version: number }> = {};
  const savedAbstract = run.variant === 'full' && stages.abstract
    ? (await db.project.findUniqueOrThrow({ where: { id: run.projectId }, select: { abstract: true } })).abstract : null;
  const renderedAbstract = stages.abstract ? renderCitations(stages.abstract, snapshot) : null;
  const citedAbstract = renderedAbstract && !findings.some(finding => finding.severity === 'error' && finding.chapter === 0) &&
    (!savedAbstract || savedAbstract === renderedAbstract) ? stages.abstract : '';
  const publishedOutputs: Output[] = [];
  for (const output of [...stages.final].sort((a, b) => a.number - b.number)) {
    if (findings.some(finding => finding.severity === 'error' && (!finding.chapter || finding.chapter === output.number)) ||
      validate(output.text, snapshot).some(finding => finding.severity === 'error') ||
      references(output.text, snapshot).findings.some(finding => finding.severity === 'error')) continue;
    const isCompleteDocument = !snapshot.scope.chapterNumber && stages.final.length === 5;
    const bibliography = isCompleteDocument && output.number === 5
      ? references([citedAbstract, ...[...publishedOutputs, output].map(item => item.text)].join('\n'), snapshot).lines
        .map(line => line.replace(/^\[SRC:[^\]]+\] /, '')) : [];
    const content = renderCitations(output.text, snapshot) +
      (bibliography.length ? `\n\n## References\n\n${bibliography.join('\n')}` : '');
    try {
      const saved = await db.$transaction(async tx => {
        const chapter = await tx.chapter.findUnique({ where: { projectId_number: {
          projectId: run.projectId, number: output.number } } });
        if (!chapter) {
          const newContent = output.section ? `## ${output.section}\n\n${content}` : content;
          await tx.chapter.create({ data: { projectId: run.projectId, number: output.number,
            title: snapshot.chapters.find(item => item.number === output.number)?.title ?? `Chapter ${output.number}`,
            content: newContent, version: 1, status: run.status === 'COMPLETED' ? 'GENERATED' : 'NEEDS_REVIEW',
            wordCount: newContent.trim().split(/\s+/).length, generatedAt: new Date() } });
          return { version: 1, hash: hashText(newContent) };
        }
        const previous = run.published && typeof run.published === 'object' && !Array.isArray(run.published)
          ? run.published[output.number] : null;
        if (!output.section && chapter.content === content) return { version: chapter.version, hash: hashText(chapter.content) };
        if (previous && typeof previous === 'object' && !Array.isArray(previous) &&
          'hash' in previous && previous.hash === hashText(chapter.content) &&
          'version' in previous && previous.version === chapter.version) {
          if (isCompleteDocument && output.number === 5 && chapter.content !== content) {
            const previousVersions = Array.isArray(chapter.previousVersions) ? chapter.previousVersions : [];
            const changed = await tx.chapter.updateMany({ where: { id: chapter.id, version: chapter.version, content: chapter.content },
              data: { content, version: { increment: 1 },
                previousVersions: [...previousVersions, { version: chapter.version, content: chapter.content, createdAt: new Date().toISOString() }].slice(-10),
                wordCount: content.trim().split(/\s+/).length, generatedAt: new Date() } });
            return changed.count ? { version: chapter.version + 1, hash: hashText(content) } : null;
          }
          return { version: chapter.version, hash: hashText(chapter.content) };
        }
        const expected = snapshot.chapters.find(item => item.number === output.number);
        if (!expected || chapter.version !== expected.version || hashText(chapter.content) !== expected.contentHash) return null;
        if (!output.section && chapter.content.trim()) return null;
        let newContent = content;
        if (output.section) {
          const lines = chapter.content.split('\n');
          const start = lines.findIndex(line => line.trim() === `## ${output.section}`);
          const end = start < 0 ? lines.length : lines.findIndex((line, index) => index > start && line.startsWith('## '));
          const replacement = [`## ${output.section}`, '', content];
          newContent = (start < 0 ? [...lines, ...replacement] : [...lines.slice(0, start), ...replacement,
            ...lines.slice(end < 0 ? lines.length : end)]).join('\n').trim();
        }
        const existingVersions = Array.isArray(chapter.previousVersions) ? chapter.previousVersions : [];
        const updated = await tx.chapter.updateMany({ where: { id: chapter.id, version: expected.version, content: chapter.content },
          data: { content: newContent, version: { increment: 1 }, status: run.status === 'COMPLETED' ? 'GENERATED' : 'NEEDS_REVIEW',
            previousVersions: [...existingVersions, { version: chapter.version, content: chapter.content, createdAt: new Date().toISOString() }].slice(-10),
            wordCount: newContent.trim().split(/\s+/).length, generatedAt: new Date() } });
        return updated.count ? { version: chapter.version + 1, hash: hashText(newContent) } : null;
      });
      if (!saved) throw new Error('Existing chapter was edited; draft kept in run history');
      published[output.number] = saved;
      publishedOutputs.push(output);
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Existing chapter was edited; draft kept in run history') &&
        !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      if (!findings.some(finding => finding.code === 'EDIT_CONFLICT' && finding.chapter === output.number))
        findings.push({ code: 'EDIT_CONFLICT', chapter: output.number,
          detail: `Chapter ${output.number} has content or was edited since this run started. Generated draft remains in the comparison view.`, severity: 'warning' });
    }
  }
  if (run.variant === 'full' && !snapshot.scope.chapterNumber && renderedAbstract &&
    !findings.some(finding => finding.severity === 'error' && finding.chapter === 0)) {
    const project = await db.project.findUniqueOrThrow({ where: { id: run.projectId }, select: { abstract: true } });
    if (project.abstract === renderedAbstract) published.abstract = { hash: hashText(renderedAbstract), version: 0 };
    else if (!project.abstract) {
      const result = await db.project.updateMany({ where: { id: run.projectId, abstract: project.abstract }, data: { abstract: renderedAbstract } });
      if (result.count) published.abstract = { hash: hashText(renderedAbstract), version: 0 };
    }
    if (!published.abstract) findings.push({ code: 'ABSTRACT_EDIT_CONFLICT', severity: 'warning',
      detail: 'The saved abstract changed during generation. It was preserved; inspect and rerun validation.' });
  }
  await db.writingRun.update({ where: { id: runId }, data: { published: published as Prisma.InputJsonValue,
    findings: findings as Prisma.InputJsonValue,
    status: findings.length ? 'NEEDS_REVIEW' : run.status } });
}
