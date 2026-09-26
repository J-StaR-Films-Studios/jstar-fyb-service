import { test } from 'node:test';
import { equal, ok, rejects } from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { checkBibliography, checkExport } from './export-readiness';
import { publishRun } from './publish';
import { execute, hashText, PIPELINE_VERSION, type Finding, type Generate, type Snapshot, type Stages } from './pipeline';
import { prisma } from '@/lib/prisma';

function fixture(facts: Snapshot['facts'] = []) {
  const snapshot: Snapshot = { topic: 'Synthetic study', abstract: null, outline: null, scope: {},
    chapters: ['Introduction', 'Literature Review', 'Methodology', 'Results', 'Conclusion'].map((title, index) =>
      ({ number: index + 1, title, version: 0, contentHash: hashText(''), headings: [] })), facts,
    sources: [{ id: 'paper', evidenceHash: 'source-hash', title: 'Synthetic paper', author: 'Lee', year: '2022',
      doi: null, url: null, venue: null, level: 'ABSTRACT', passage: 'The study compares two methods.',
      summary: null, location: null, verification: 'UNVERIFIED', limitations: 'Abstract only' },
    ...facts.flatMap(fact => fact.kind === 'artifact_backed' && fact.evidenceReference ? [{
      id: fact.evidenceReference, evidenceHash: 'results-hash', title: null, author: null, year: null,
      doi: null, url: null, venue: null, level: 'UPLOADED_TEXT', passage: fact.description,
      summary: null, location: null, verification: 'UNVERIFIED', limitations: null }] : [])] };
  const run: { id: string; projectId: string; variant: string; pipelineVersion: string; settings: Record<string, string>; snapshot: Snapshot; status: string; stages: Stages;
    findings: Finding[]; metrics: Record<string, unknown>; published: Prisma.JsonValue; updatedAt: Date } = {
      id: 'run', projectId: 'project', variant: 'full', pipelineVersion: PIPELINE_VERSION, settings: {}, snapshot, status: 'PENDING', stages: {}, findings: [], metrics: {}, published: {}, updatedAt: new Date() };
  // In-memory repository uses the same save and claim boundaries as execute. No database or provider is used.
  const writingRun = {
    updateMany: async ({ where, data }: { where: { status?: string; OR?: unknown }; data: Record<string, unknown> }) => {
      if (where.OR && !['PENDING', 'FAILED'].includes(run.status)) return { count: 0 };
      if (where.status && where.status !== run.status) return { count: 0 };
      Object.assign(run, structuredClone(data)); return { count: 1 };
    },
    update: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(run, structuredClone(data)); return run; },
    findUniqueOrThrow: async () => structuredClone(run),
  };
  const chapters: { id: string; number: number; title: string; content: string; version: number; previousVersions: Prisma.JsonValue }[] = [];
  const project: { abstract: string | null } = { abstract: null };
  const chapter = {
    findUnique: async ({ where }: { where: { projectId_number: { number: number } } }) =>
      chapters.find(item => item.number === where.projectId_number.number) ?? null,
    create: async ({ data }: { data: { number: number; title: string; content: string; version: number } }) => {
      const saved = { id: `chapter-${data.number}`, number: data.number, title: data.title, content: data.content,
        version: data.version, previousVersions: [] }; chapters.push(saved); return saved;
    },
    updateMany: async ({ where, data }: { where: { id: string; version: number; content: string };
      data: { content: string; previousVersions: Prisma.JsonValue } }) => {
      const saved = chapters.find(item => item.id === where.id && item.version === where.version && item.content === where.content);
      if (!saved) return { count: 0 };
      saved.content = data.content; saved.previousVersions = data.previousVersions; saved.version++; return { count: 1 };
    },
  };
  // The repository is a test double; production uses the real, typed Prisma client.
  const db = { writingRun, chapter, project: {
    findUniqueOrThrow: async () => project,
    updateMany: async ({ data }: { data: { abstract: string } }) => {
      if (project.abstract) return { count: 0 };
      project.abstract = data.abstract; return { count: 1 };
    },
  }, $transaction: async (action: (client: typeof prisma) => Promise<unknown>) => action(db) } as unknown as typeof prisma;
  return { run, snapshot, db, chapters, project };
}

const plan = JSON.stringify({ chapters: [1, 2, 3, 4, 5].map(number =>
  ({ number, argument: `Examine chapter ${number} using supplied materials`, sourceIds: ['paper'] })) });
const generator: Generate = async (stage, prompt) => {
  if (stage === 'plan') return plan;
  if (stage === 'abstract') return 'The project examines a synthetic study using a planned comparison.';
  if (stage === 'editorialReview') return JSON.stringify({ issues: [{ chapter: 1, excerpt: 'broad claim', problem: 'Vague assertion', uncertain: true }] });
  if (stage === 'factualReview') return JSON.stringify({ issues: [{ chapter: 1, excerpt: 'broad claim', problem: 'The abstract does not support this conclusion', uncertain: true }] });
  if (stage === 'postRevisionReview') return JSON.stringify({ issues: [{ chapter: 1, excerpt: 'new claim', problem: 'The abstract still does not support the new wording', uncertain: true }] });
  if (stage === 'editorial') return 'The abstract compares methods [SRC:paper].';
  if (stage === 'revision') return 'The abstract describes a comparison of methods [SRC:paper].';
  const match = prompt.match(/"number":(\d+)/);
  return match?.[1] === '1' ? 'A broad claim [SRC:paper].' : `Chapter ${match?.[1]} discusses the planned study [SRC:paper].`;
};

test('synthetic project flows through draft, targeted review, revision, validation and export readiness', async () => {
  const { run, db } = fixture();
  await execute(run.id, generator, db);
  equal(run.stages.draft?.length, 5);
  equal(run.stages.final?.[0].text, 'The abstract describes a comparison of methods [SRC:paper].');
  ok(run.findings.some(f => f.code === 'MODEL_EVIDENCE_CONCERN'));
  ok(run.findings.some(f => f.code === 'POST_REVISION_CONCERN'));
  ok(run.findings.some(f => f.code === 'MISSING_PROJECT_RESULTS'));
  equal(run.status, 'NEEDS_REVIEW');
  await publishRun(run.id, db);
  ok(!checkExport(run, []).ready);

  const supported = fixture([{ kind: 'artifact_backed', description: 'Results supplied', evidenceReference: 'results' }]);
  const clean: Generate = (stage, prompt) => stage === 'plan' ? Promise.resolve(plan)
    : stage === 'abstract' ? Promise.resolve('This synthetic study compares methods.')
      : stage === 'editorialReview' || stage === 'factualReview'
        ? Promise.resolve('{"issues":[]}') : Promise.resolve(`Chapter ${prompt.match(/"number":(\d+)/)?.[1]} compares methods [SRC:paper].`);
  await execute(supported.run.id, clean, supported.db);
  equal(supported.run.status, 'COMPLETED');
  await publishRun(supported.run.id, supported.db);
  equal(supported.chapters.length, 5);
  equal(supported.project.abstract, 'This synthetic study compares methods.');
  ok(supported.chapters[4].content.includes('## References'));
  ok(supported.chapters[4].content.includes('Lee. (2022). Synthetic paper'));
  ok(checkExport(supported.run, supported.chapters, supported.project.abstract).ready);
  ok(checkBibliography(supported.snapshot, supported.run.stages, supported.chapters));
  ok(!checkBibliography(supported.snapshot, supported.run.stages,
    supported.chapters.map(chapter => chapter.number === 5 ? { ...chapter,
      content: chapter.content.replace('Lee. (2022). Synthetic paper', 'Lee. (2022). Different paper') } : chapter)));
  ok(!checkExport(supported.run, supported.chapters, 'A changed abstract').ready);
  ok(!checkExport(supported.run, supported.chapters.map(chapter => chapter.number === 2 ? { ...chapter, content: `${chapter.content} user edit` } : chapter), supported.project.abstract).ready);
});

test('rejected chapters cannot contribute orphaned bibliography entries', async () => {
  const { run, db, snapshot, chapters } = fixture([{ kind: 'artifact_backed', description: 'Results supplied', evidenceReference: 'results' }]);
  snapshot.sources.push({ ...snapshot.sources[0], id: 'incomplete', author: null, title: 'Incomplete metadata' });
  const draft: Generate = async (stage, prompt) => {
    if (stage === 'plan') return plan;
    if (stage === 'editorialReview' || stage === 'factualReview') return '{"issues":[]}';
    if (stage === 'abstract') return 'This study compares methods.';
    const number = Number(prompt.match(/Write an academic draft for \{"number":(\d+)/)?.[1]);
    return `Chapter ${number} compares methods [SRC:${number === 1 ? 'incomplete' : 'paper'}].`;
  };
  await execute(run.id, draft, db);
  await publishRun(run.id, db);
  equal(chapters.some(chapter => chapter.number === 1), false);
  const references = chapters.find(chapter => chapter.number === 5)?.content ?? '';
  ok(references.includes('Synthetic paper'));
  ok(!references.includes('Incomplete metadata'));
});

test('adding a results artifact permits re-review of previously published chapters without replacing them', async () => {
  const first = fixture();
  const draft: Generate = (stage, prompt) => Promise.resolve(stage === 'plan' ? plan
    : stage === 'abstract' ? 'The synthetic study examines planned work.'
      : stage === 'editorialReview' || stage === 'factualReview'
        ? '{"issues":[]}' : `Chapter ${prompt.match(/"number":(\d+)/)?.[1]} describes planned work [SRC:paper].`);
  await execute(first.run.id, draft, first.db);
  await publishRun(first.run.id, first.db);
  equal(first.run.status, 'NEEDS_REVIEW');
  equal(first.chapters.length, 5);

  const second = fixture([{ kind: 'artifact_backed', description: 'Results file supplied', evidenceReference: 'uploaded-results' }]);
  second.chapters.push(...structuredClone(first.chapters));
  second.project.abstract = first.project.abstract;
  second.snapshot.abstract = first.project.abstract;
  second.snapshot.chapters.forEach(chapter => {
    const saved = second.chapters.find(item => item.number === chapter.number);
    if (saved) { chapter.version = saved.version; chapter.contentHash = hashText(saved.content); }
  });
  second.run.stages.draft = structuredClone(first.run.stages.final);
  await execute(second.run.id, async stage => {
    if (stage === 'draft') throw new Error('Earlier approved draft should be reused');
    return stage === 'plan' ? plan : '{"issues":[]}';
  }, second.db);
  await publishRun(second.run.id, second.db);
  equal(second.run.status, 'COMPLETED');
  ok(checkExport(second.run, second.chapters, second.project.abstract).ready);
  equal(second.chapters[0].version, first.chapters[0].version);
});

test('publishing a generated document preserves an existing user-edited chapter', async () => {
  const { run, db, chapters } = fixture([{ kind: 'artifact_backed', description: 'Results supplied', evidenceReference: 'results' }]);
  const clean: Generate = (stage, prompt) => Promise.resolve(stage === 'plan' ? plan
    : stage === 'abstract' ? 'This synthetic study describes the supplied materials.'
      : stage === 'editorialReview' || stage === 'factualReview'
        ? '{"issues":[]}' : `Chapter ${prompt.match(/"number":(\d+)/)?.[1]} discusses the study [SRC:paper].`);
  chapters.push({ id: 'edited', number: 1, title: 'Introduction', content: 'My saved edits', version: 2, previousVersions: [] });
  await execute(run.id, clean, db);
  await publishRun(run.id, db);
  equal(chapters[0].content, 'My saved edits');
  ok(run.findings.some(finding => finding.code === 'EDIT_CONFLICT' && finding.chapter === 1));
  equal(run.status, 'NEEDS_REVIEW');
});

test('provider failure after one chapter resumes without regenerating saved text', async () => {
  const { run, db } = fixture();
  let drafts = 0;
  const failOnce: Generate = async (stage, prompt) => {
    if (stage === 'draft' && ++drafts === 2) throw new Error('provider unavailable');
    return generator(stage, prompt);
  };
  await rejects(() => execute(run.id, failOnce, db));
  equal(run.status, 'FAILED');
  equal(run.stages.draft?.length, 1);
  await execute(run.id, generator, db);
  equal(run.stages.draft?.length, 5);
  equal(run.stages.draft?.filter(output => output.number === 1).length, 1);
  equal(run.status, 'NEEDS_REVIEW');
});

test('cancelled run makes no provider calls', async () => {
  const { run, db } = fixture();
  run.status = 'CANCELLED';
  let calls = 0;
  await execute(run.id, async () => { calls++; return 'text'; }, db);
  equal(calls, 0);
});
