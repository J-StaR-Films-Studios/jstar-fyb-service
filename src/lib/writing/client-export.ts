export type SavedChapter = { number: number; title: string; content: string };

export async function fetchSavedExportDocument(projectId: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/chapters`);
  if (!response.ok) throw new Error('Could not fetch saved document');
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('chapters' in result) || !Array.isArray(result.chapters) ||
      !('abstract' in result) || typeof result.abstract !== 'string' || !result.abstract.trim() ||
      result.chapters.length !== 5 || result.chapters.some(chapter => !chapter || typeof chapter !== 'object' ||
        typeof chapter.number !== 'number' || typeof chapter.title !== 'string' || typeof chapter.content !== 'string'))
    throw new Error('Saved document is incomplete');
  return { abstract: result.abstract, chapters: result.chapters as SavedChapter[] };
}

export function documentMarkdown(abstract: string, chapters: SavedChapter[]) {
  return `# Abstract\n\n${abstract}\n\n` + [...chapters].sort((a, b) => a.number - b.number)
    .map(chapter => `# Chapter ${chapter.number}: ${chapter.title}\n\n${chapter.content}`).join('\n\n');
}

export async function requireReadyToExport(projectId: string) {
  if (process.env.NEXT_PUBLIC_ACADEMIC_PIPELINE_ENABLED !== 'true') return;
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/writing/export-status`);
  const result: { ready?: boolean; reason?: string } = await response.json();
  if (!response.ok || !result.ready) throw new Error(result.reason || 'Review the writing run before exporting.');
}
