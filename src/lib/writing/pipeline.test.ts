import { test } from 'node:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { checkCrossChapter, references, validate, type Snapshot } from './pipeline';

const snapshot: Snapshot = { topic: 'Test', abstract: null, outline: null, scope: {}, chapters: [], facts: [],
  sources: [{ id: 'one', evidenceHash: 'abc', title: 'Example', author: 'A. Author', year: '2020', doi: null, url: null,
    venue: null, level: 'SNIPPET', passage: 'Sample', summary: null, location: null, verification: null, limitations: null }] };

test('only cited stored sources appear in references; unresolved IDs are flagged', () => {
  const text = 'Background [SRC:one], comparison [SRC:missing].';
  deepStrictEqual(references(text, snapshot).lines, ['[SRC:one] A. Author. (2020). Example']);
  ok(validate(text, snapshot).some(f => f.code === 'UNRESOLVED_SOURCE'));
});
test('revision rejects changed numbers and non-full-text overclaims', () => {
  const findings = validate('Table 2 shows 43% in the entire study [SRC:one].', snapshot, '42% [SRC:one]');
  ok(findings.some(f => f.code === 'CHANGED_NUMBER'));
  ok(findings.some(f => f.code === 'FULL_TEXT_OVERCLAIM'));
});
test('a valid citation can still attach to an unsupported claim', () => {
  const text = 'The entire paper proves a 40% improvement [SRC:one].';
  ok(!validate(text, snapshot).some(finding => finding.code === 'UNRESOLVED_SOURCE'));
  ok(validate(text, snapshot).some(finding => finding.code === 'FULL_TEXT_OVERCLAIM'));
});
test('an unrelated source with the same percentage cannot support a project result', () => {
  const project = { ...snapshot, sources: [...snapshot.sources.map(source => ({ ...source,
    passage: 'The paper reports a 40% improvement in an unrelated application.' })),
    { ...snapshot.sources[0], id: 'results', level: 'UPLOADED_TEXT', passage: 'Accuracy was 50%.' }],
    facts: [{ kind: 'artifact_backed', description: 'Accuracy was 50%.', evidenceReference: 'results' }] };
  const findings = validate('Our implementation improved throughput by 40% [SRC:one].', project);
  ok(findings.some(finding => finding.code === 'UNSUPPORTED_PROJECT_RESULT'));
  const supported = { ...project, sources: project.sources.map(source => source.id === 'results'
    ? { ...source, passage: 'Throughput improved by 40%.' } : source),
    facts: [{ kind: 'artifact_backed', description: 'Throughput improved by 40%.', evidenceReference: 'results' }] };
  ok(!validate('Our implementation improved throughput by 40% [SRC:results].', supported)
    .some(finding => finding.code === 'UNSUPPORTED_PROJECT_RESULT'));
});
test('cross chapter contradictory measurements are flagged', () => {
  const findings = checkCrossChapter([{ number: 1, text: 'Accuracy was 76%', references: [] },
    { number: 2, text: 'Accuracy was 88%', references: [] }]);
  ok(findings.some(f => f.code === 'CROSS_CHAPTER_NUMBER'));
});
