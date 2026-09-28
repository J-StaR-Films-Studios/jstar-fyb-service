import { test } from 'node:test';
import { equal, match, rejects } from 'node:assert/strict';
import { documentMarkdown, fetchSavedExportDocument } from './client-export';

test('saved export fails closed when chapter fetch fails or document is incomplete', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }));
  await rejects(fetchSavedExportDocument('owned'), /Could not fetch saved document/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ chapters: [], abstract: '' }));
  await rejects(fetchSavedExportDocument('owned'), /Saved document is incomplete/);
});

test('saved export includes the accepted abstract before the chapters', async t => {
  const chapters = [1, 2, 3, 4, 5].map(number => ({ number, title: `Chapter ${number}`, content: `Content ${number}` }));
  t.mock.method(globalThis, 'fetch', async () => Response.json({ chapters, abstract: 'A supported abstract.' }));
  const saved = await fetchSavedExportDocument('owned');
  equal(saved.chapters.length, 5);
  match(documentMarkdown(saved.abstract, saved.chapters), /^# Abstract\n\nA supported abstract\.\n\n# Chapter 1:/);
});
