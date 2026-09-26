'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DiffViewer } from './DiffViewer';

type Output = { number: number; section?: string; text: string; references: string[] };
type Finding = { code: string; detail: string; severity: string };
type Measurement = {
    id: string; detector?: string; detectorName?: string; detectorVersion?: string | null;
    score?: number; label?: string | null; rawResult?: unknown; testedTextHash?: string;
    testedVersion?: string | null; measuredAt?: string; limitations?: string | null;
};
type Run = {
    id: string; variant: string; status: string; snapshotHash: string; pipelineVersion?: string; settings?: Record<string, string>;
    createdAt: string; updatedAt: string; error?: string | null;
    stages?: { draft?: Output[]; final?: Output[]; factualReview?: string };
    findings?: Finding[]; metrics?: { chapters?: number; words?: number; errorCount?: number; cost?: number;
        stages?: { stage: string; latencyMs: number; provider?: string; modelId?: string; inputTokens?: number; outputTokens?: number; failed?: boolean }[]; failures?: number };
    snapshot?: { facts?: { kind: string }[]; sources?: { id: string; level: string; limitations?: string | null }[] };
    measurements?: Measurement[];
};

const date = (value: string) => new Date(value).toLocaleString();
const runName = (run: Run) => `${date(run.createdAt)} · ${run.status} · ${run.id.slice(0, 8)}`;
const runUrl = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/writing/runs`;

async function responseJson(response: Response): Promise<unknown> {
    const body: unknown = await response.json();
    if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error : `Request failed (${response.status})`;
        throw new Error(message);
    }
    return body;
}

export function WritingComparisonPanel({ projectId, onClose, hasUnsavedEdits }: {
    projectId: string; onClose: () => void; hasUnsavedEdits: boolean;
}) {
    const [runs, setRuns] = useState<Run[]>([]);
    const [details, setDetails] = useState<Record<string, Run>>({});
    const [leftId, setLeftId] = useState('');
    const [rightId, setRightId] = useState('');
    const [busy, setBusy] = useState(false);
    const launchInProgress = useRef(false);
    const launchKey = useRef<{ signature: string; key: string } | null>(null);
    const [error, setError] = useState('');
    const [rating, setRating] = useState<Record<string, Record<string, string>>>({});
    const [variant, setVariant] = useState<'baseline' | 'context' | 'editorial' | 'full'>('full');
    const [reuseSnapshot, setReuseSnapshot] = useState(false);
    const [tonePreference, setTonePreference] = useState('');
    const [chapterNumber, setChapterNumber] = useState(0);
    const [applyChapterNumber, setApplyChapterNumber] = useState(1);
    const [fact, setFact] = useState('');
    const [evidenceReference, setEvidenceReference] = useState('');
    const [evidenceSources, setEvidenceSources] = useState<{ id: string; title: string | null; availableArtifact: boolean }[]>([]);
    const [detectorName, setDetectorName] = useState('');
    const [detectorVersion, setDetectorVersion] = useState('');
    const [rawResult, setRawResult] = useState('');
    const [measuredAt, setMeasuredAt] = useState('');
    const [limitations, setLimitations] = useState('');

    const loadEvidence = useCallback(async () => {
        const body = await responseJson(await fetch(`/api/projects/${encodeURIComponent(projectId)}/writing/evidence`));
        if (body && typeof body === 'object' && 'sources' in body && Array.isArray(body.sources))
            setEvidenceSources(body.sources as { id: string; title: string | null; availableArtifact: boolean }[]);
    }, [projectId]);

    const loadRuns = useCallback(async () => {
        const body = await responseJson(await fetch(runUrl(projectId)));
        if (!body || typeof body !== 'object' || !('runs' in body) || !Array.isArray(body.runs)) throw new Error('Invalid runs response');
        const list = body.runs as Run[];
        setRuns(list);
        setLeftId(previous => previous && list.some(run => run.id === previous) ? previous : list[0]?.id ?? '');
        setRightId(previous => previous && list.some(run => run.id === previous) ? previous : list[1]?.id ?? '');
    }, [projectId]);

    useEffect(() => {
        Promise.resolve().then(loadEvidence).catch(() => { /* A fact can still be added without a source. */ });
    }, [loadEvidence]);

    useEffect(() => {
        let live = true;
        responseJsonPromise();
        async function responseJsonPromise() {
            try {
                const body = await responseJson(await fetch(runUrl(projectId)));
                if (!body || typeof body !== 'object' || !('runs' in body) || !Array.isArray(body.runs)) throw new Error('Invalid runs response');
                if (live) {
                    const list = body.runs as Run[];
                    setRuns(list);
                    setLeftId(list[0]?.id ?? '');
                    setRightId(list[1]?.id ?? '');
                }
            } catch (cause) { if (live) setError(cause instanceof Error ? cause.message : 'Could not load runs'); }
        }
        return () => { live = false; };
    }, [projectId]);

    useEffect(() => {
        const ids = [leftId, rightId].filter(id => id && !details[id]);
        if (!ids.length) return;
        let live = true;
        Promise.all(ids.map(async id => {
            const body = await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(id)}`));
            if (!body || typeof body !== 'object' || !('run' in body)) throw new Error('Invalid run response');
            return body.run as Run;
        })).then(loaded => {
            if (live) setDetails(previous => ({ ...previous, ...Object.fromEntries(loaded.map(run => [run.id, run])) }));
        }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'Could not load run'); });
        return () => { live = false; };
    }, [projectId, leftId, rightId, details]);

    const left = details[leftId];
    const right = details[rightId];
    const selectedApplyChapter = left?.stages?.final?.some(output => output.number === applyChapterNumber)
        ? applyChapterNumber : left?.stages?.final?.[0]?.number ?? 1;
    const outputs = Array.from(new Set([...(left?.stages?.final ?? left?.stages?.draft ?? []), ...(right?.stages?.final ?? right?.stages?.draft ?? [])]
        .map(output => `${output.number}:${output.section ?? ''}`)));

    async function startRun() {
        if (launchInProgress.current) return;
        launchInProgress.current = true;
        const signature = JSON.stringify({ variant, chapterNumber, snapshotRunId: reuseSnapshot && !chapterNumber ? left?.id : null,
            tonePreference: tonePreference });
        if (launchKey.current?.signature !== signature) launchKey.current = { signature, key: crypto.randomUUID() };
        setBusy(true); setError('');
        try {
            const body = await responseJson(await fetch(runUrl(projectId), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variant, idempotencyKey: launchKey.current.key,
                    ...(chapterNumber ? { scope: { chapterNumber } } : {}),
                    ...(reuseSnapshot && left && !chapterNumber ? { snapshotRunId: left.id } : { tonePreference: tonePreference.trim() || undefined }) }),
            }));
            if (!body || typeof body !== 'object' || !('run' in body)) throw new Error('Invalid run response');
            const run = body.run as Run;
            setDetails(previous => ({ ...previous, [run.id]: run }));
            await loadRuns();
            setLeftId(run.id);
            launchKey.current = null;
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start run'); }
        finally { launchInProgress.current = false; setBusy(false); }
    }

    async function changeRun(run: Run, action: 'resume' | 'cancel') {
        setBusy(true); setError('');
        try {
            const body = await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(run.id)}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
            }));
            if (body && typeof body === 'object' && 'run' in body) setDetails(previous => ({ ...previous, [run.id]: body.run as Run }));
            await loadRuns();
        } catch (cause) { setError(cause instanceof Error ? cause.message : `Could not ${action} run`); }
        finally { setBusy(false); }
    }

    async function applyChapterDraft() {
        if (!left || !window.confirm(`Replace saved Chapter ${selectedApplyChapter} with this draft? The previous content will be saved as a version. Unsaved changes cannot be recovered.`)) return;
        setBusy(true); setError('');
        try {
            await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(left.id)}/apply`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterNumber: selectedApplyChapter }),
            }));
            const refreshed = await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(left.id)}`));
            if (refreshed && typeof refreshed === 'object' && 'run' in refreshed)
                setDetails(previous => ({ ...previous, [left.id]: refreshed.run as Run }));
            setError('Draft applied. Close this view to reload the chapter; resolve any remaining evidence findings before export.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not apply draft'); }
        finally { setBusy(false); }
    }

    async function addFact() {
        setBusy(true); setError('');
        try {
            await responseJson(await fetch(`/api/projects/${encodeURIComponent(projectId)}/writing/facts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind: evidenceReference.trim() ? 'artifact_backed' : 'user_reported',
                    description: fact.trim(), ...(evidenceReference.trim() ? { evidenceReference: evidenceReference.trim() } : {}) }),
            }));
            setFact(''); setEvidenceReference('');
            setError('Fact saved. Clear variant A and run the affected chapter to use the updated snapshot.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save fact'); }
        finally { setBusy(false); }
    }

    async function importMeasurement() {
        if (!left?.stages?.final?.length) { setError('Select a run with final text before importing a measurement.'); return; }
        let parsed: unknown;
        try { parsed = JSON.parse(rawResult); }
        catch { setError('Raw result must be valid JSON.'); return; }
        setBusy(true); setError('');
        try {
            const text = left.stages.final.map(output => output.text).join('\n\n');
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
            const testedTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(left.id)}/measurements`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ detectorName: detectorName.trim(), detectorVersion: detectorVersion.trim() || undefined,
                    testedTextHash, testedVersion: 'final', measuredAt: new Date(measuredAt).toISOString(),
                    rawResult: parsed, limitations: limitations.trim() || undefined }),
            }));
            const body = await responseJson(await fetch(`${runUrl(projectId)}/${encodeURIComponent(left.id)}`));
            if (body && typeof body === 'object' && 'run' in body) setDetails(previous => ({ ...previous, [left.id]: body.run as Run }));
            setRawResult('');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import measurement'); }
        finally { setBusy(false); }
    }

    function exportJson() {
        const blob = new Blob([JSON.stringify({ left, right, humanRatings: rating }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'writing-comparison.json'; link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div role="dialog" aria-modal="true" aria-label="Writing comparison" className="fixed inset-0 z-[70] bg-[#050508] text-gray-200 flex flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
                <h2 className="text-base font-semibold">Writing runs · internal comparison</h2>
                <div className="flex gap-2 text-sm">
                    <button onClick={loadRuns} className="rounded border border-white/20 px-3 py-1 hover:bg-white/10">Refresh</button>
                    <button onClick={startRun} disabled={busy || hasUnsavedEdits} className="rounded bg-primary px-3 py-1 text-white disabled:opacity-50">{busy ? 'Working…' : 'Start automatic run'}</button>
                    <button onClick={onClose} className="rounded border border-white/20 px-3 py-1 hover:bg-white/10">Close</button>
                </div>
            </header>
            <div className="overflow-y-auto p-4 md:p-6 space-y-5">
                {hasUnsavedEdits && <p role="status" className="text-amber-300">Save editor changes before starting a run. This view will not replace your edits.</p>}
                <div className="flex flex-wrap gap-3 text-sm items-end"><label>Comparison variant
                    <select className="block rounded border border-white/20 bg-gray-900 p-2" value={variant} onChange={event => setVariant(event.target.value as typeof variant)}>
                        <option value="full">Complete pipeline</option><option value="baseline">Existing prompt baseline</option><option value="context">Evidence context</option><option value="editorial">Context and editorial review</option>
                    </select></label>
                    <label>Writing preference (optional)<input className="block rounded border border-white/20 bg-gray-900 p-2" maxLength={500} value={tonePreference} onChange={event => setTonePreference(event.target.value)} placeholder="e.g. concise, direct" /></label>
                    <label>Scope<select className="block rounded border border-white/20 bg-gray-900 p-2" value={chapterNumber} onChange={event => setChapterNumber(Number(event.target.value))}>
                        <option value={0}>Complete document</option>{[1, 2, 3, 4, 5].map(number => <option key={number} value={number}>Chapter {number}</option>)}
                    </select></label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={reuseSnapshot} onChange={event => setReuseSnapshot(event.target.checked)} disabled={!left || !!chapterNumber} />Reuse A inputs for a controlled comparison</label>
                    <span className="text-gray-400">{reuseSnapshot && left && !chapterNumber ? 'Using variant A input snapshot.' : 'Captures current project materials.'}</span>
                </div>
                <p className="text-xs text-gray-400">Drafts are suggestions only. Review all claims and sources before use. Detector results are manually imported measurements, not proof of authorship.</p>
                {error && <p role="alert" className="text-red-300">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {([leftId, rightId] as const).map((id, index) => (
                        <label key={index} className="text-sm space-y-1">Variant {index === 0 ? 'A' : 'B'}
                            <select className="block w-full rounded border border-white/20 bg-gray-900 p-2" value={id} onChange={event => (index === 0 ? setLeftId : setRightId)(event.target.value)}>
                                <option value="">Select a run</option>
                                {runs.map(run => <option key={run.id} value={run.id}>{runName(run)}</option>)}
                            </select>
                        </label>
                    ))}
                </div>
                {[left, right].map((run, index) => run && <section key={run.id + index} className="border-t border-white/10 pt-3 text-sm space-y-2">
                    <h3 className="font-semibold">Variant {index === 0 ? 'A' : 'B'} · {run.status}</h3>
                    <div className="flex gap-2">
                        {['FAILED', 'PENDING', 'NEEDS_REVIEW', 'COMPLETED'].includes(run.status) && <button disabled={busy} onClick={() => changeRun(run, 'resume')} className="border border-white/20 rounded px-2 py-1 disabled:opacity-50">Resume / retry publish</button>}
                        {run.status === 'RUNNING' && <button onClick={() => changeRun(run, 'cancel')} className="border border-white/20 rounded px-2 py-1">Request cancellation</button>}
                    </div>
                    <p className="text-gray-400">Snapshot {run.snapshotHash?.slice(0, 12)} · Pipeline {run.pipelineVersion ?? 'unknown'} · {date(run.createdAt)}{run.error ? ` · ${run.error}` : ''}</p>
                    <p>Drafts: {run.stages?.draft?.length ?? 0} · Final: {run.stages?.final?.length ?? 0} · Words: {run.metrics?.words ?? 'not recorded'} · Failures: {run.metrics?.failures ?? 0}</p>
                    <p className="text-gray-400">Provider cost: {run.metrics?.cost === undefined ? 'not reported' : String(run.metrics.cost)} · Recorded stage latency: {run.metrics?.stages?.reduce((total, stage) => total + stage.latencyMs, 0) ?? 0} ms</p>
                    {!!run.metrics?.stages?.length && <details className="text-gray-400"><summary>Models, tokens and stage timings</summary>
                        {run.metrics.stages.map((stage, i) => <p key={i}>{stage.stage}{stage.failed ? ' (failed)' : ''}: {stage.provider ?? 'not recorded'}/{stage.modelId ?? 'unknown'} · {stage.inputTokens ?? '?'} in / {stage.outputTokens ?? '?'} out · {stage.latencyMs} ms</p>)}
                    </details>}
                    <div className="flex flex-wrap gap-2">{['readability', 'specificity', 'coherence', 'factual quality'].map(dimension => <label key={dimension}>Human {dimension} (local)
                        <select className="block bg-gray-900 border border-white/20 rounded p-1" value={rating[run.id]?.[dimension] ?? ''} onChange={event => setRating(previous => ({ ...previous, [run.id]: { ...previous[run.id], [dimension]: event.target.value } }))}>
                            <option value="">Not rated</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}
                        </select></label>)}</div>
                    {run.snapshot && <p>Materials: {run.snapshot.facts?.length ?? 0} recorded facts; {run.snapshot.sources?.length ?? 0} sources.
                        {!(run.snapshot.facts?.some(fact => ['completed', 'artifact_backed'].includes(fact.kind))) && ' No completed or artifact-backed results supplied.'}
                        {run.snapshot.sources?.some(source => source.level !== 'UPLOADED_TEXT') && ' Some sources lack uploaded full text.'}
                    </p>}
                    {run.stages?.factualReview && <details><summary>Factual review</summary><p className="whitespace-pre-wrap">{run.stages.factualReview}</p></details>}
                    <div>{run.findings?.length ? run.findings.map((finding, i) => <p key={i} className={finding.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>{finding.severity}: {finding.code} — {finding.detail}</p>) : 'No recorded findings.'}</div>
                    {!!run.measurements?.length && <div><strong>Manual detector measurements (not authorship evidence)</strong>{run.measurements.map(measurement => <p key={measurement.id}>{measurement.detectorName ?? measurement.detector} {measurement.detectorVersion ?? ''} · {measurement.measuredAt ? date(measurement.measuredAt) : 'Date not recorded'} · {measurement.testedTextHash?.slice(0, 12) ?? 'Hash not recorded'} · {measurement.score ?? measurement.label ?? 'Raw result recorded'}{measurement.limitations && ` · ${measurement.limitations}`}</p>)}</div>}
                </section>)}
                {left && right && left.snapshotHash !== right.snapshotHash && <p className="text-amber-300 text-sm">These runs use different input snapshots; comparisons may reflect changed materials.</p>}
                <section className="border-t border-white/10 pt-4 text-sm space-y-2">
                    <h3 className="font-semibold">Supply missing project evidence</h3>
                    <p className="text-gray-400">Upload results or data in the Research tab first. Add the exact result as a project fact and select its uploaded document to mark it artifact-backed. Without an artifact it remains a user report, not a verified result. Rerun the full document with a new snapshot after saving.</p>
                    <input aria-label="Project fact" placeholder="Exact result or confirmed detail" maxLength={2000} value={fact} onChange={event => setFact(event.target.value)} className="w-full bg-gray-900 border border-white/20 rounded p-2" />
                    <div className="flex gap-2"><select aria-label="Uploaded results artifact" value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} className="flex-1 bg-gray-900 border border-white/20 rounded p-2">
                        <option value="">No uploaded artifact; user-reported fact</option>
                        {evidenceSources.filter(source => source.availableArtifact).map(source => <option value={source.id} key={source.id}>{source.title || source.id} · {source.id.slice(0, 8)}</option>)}
                    </select><button onClick={() => void loadEvidence().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not refresh artifacts'))} className="border border-white/20 rounded px-2">Refresh artifacts</button></div>
                    <button disabled={busy || !fact.trim()} onClick={addFact} className="border border-white/20 rounded px-3 py-2 disabled:opacity-50">Save fact</button>
                </section>
                {left?.stages?.final?.some(output => !output.section) && <div className="flex gap-2 items-center text-sm">
                    <select aria-label="Chapter draft to apply" className="bg-gray-900 border border-white/20 rounded p-2" value={selectedApplyChapter} onChange={event => setApplyChapterNumber(Number(event.target.value))}>
                        {left.stages.final.filter(output => !output.section).map(output => <option key={output.number} value={output.number}>Chapter {output.number}</option>)}
                    </select>
                    <button disabled={busy || hasUnsavedEdits} onClick={applyChapterDraft} className="border border-white/20 rounded px-3 py-2 disabled:opacity-50">Apply A chapter draft (versioned)</button>
                </div>}
                {outputs.length > 0 && <section className="space-y-3"><h3 className="font-semibold">Draft comparison · A vs B</h3>
                    {outputs.map(key => {
                        const a = (left?.stages?.final ?? left?.stages?.draft ?? []).find(output => `${output.number}:${output.section ?? ''}` === key);
                        const b = (right?.stages?.final ?? right?.stages?.draft ?? []).find(output => `${output.number}:${output.section ?? ''}` === key);
                        return <div key={key}><h4 className="text-sm mb-2">Chapter {a?.number ?? b?.number}{a?.section || b?.section ? ` · ${a?.section ?? b?.section}` : ''}</h4>
                            {left && right ? <DiffViewer oldText={a?.text ?? ''} newText={b?.text ?? ''} mode="split" /> : <pre className="whitespace-pre-wrap text-sm bg-black/30 p-3">{a?.text ?? b?.text}</pre>}
                            {(a?.references?.length || b?.references?.length) ? <details className="text-xs text-gray-400"><summary>References</summary><pre className="whitespace-pre-wrap">{[...(a?.references ?? []), ...(b?.references ?? [])].join('\n')}</pre></details> : null}
                        </div>;
                    })}
                </section>}
                <section className="border-t border-white/10 pt-4 space-y-3 text-sm">
                    <h3 className="font-semibold">Import external detector result for variant A</h3>
                    <p className="text-gray-400">Paste the detector response yourself. Hash is computed from the selected run’s complete final text (chapter order, joined with two newlines), not unsaved editor text. No text is uploaded to a detector by this app.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input aria-label="Detector name" placeholder="Detector name" value={detectorName} onChange={event => setDetectorName(event.target.value)} className="bg-gray-900 border border-white/20 rounded p-2" />
                        <input aria-label="Detector version" placeholder="Detector version (optional)" value={detectorVersion} onChange={event => setDetectorVersion(event.target.value)} className="bg-gray-900 border border-white/20 rounded p-2" />
                        <p className="self-center text-gray-400">Tested version: final</p>
                        <label>Measured at <input aria-label="Measured at" type="datetime-local" value={measuredAt} onChange={event => setMeasuredAt(event.target.value)} className="w-full bg-gray-900 border border-white/20 rounded p-2" /></label>
                    </div>
                    <textarea aria-label="Raw result JSON" placeholder="Raw result JSON" rows={3} value={rawResult} onChange={event => setRawResult(event.target.value)} className="w-full bg-gray-900 border border-white/20 rounded p-2" />
                    <input aria-label="Limitations" placeholder="Limitations (optional)" value={limitations} onChange={event => setLimitations(event.target.value)} className="w-full bg-gray-900 border border-white/20 rounded p-2" />
                    <div className="flex gap-2"><button disabled={busy || !left?.stages?.final?.length || !detectorName.trim() || !rawResult.trim() || !measuredAt} onClick={importMeasurement} className="bg-primary rounded px-3 py-2 disabled:opacity-50">Import result</button>
                        <button disabled={!left && !right} onClick={exportJson} className="border border-white/20 rounded px-3 py-2 disabled:opacity-50">Export comparison JSON</button></div>
                </section>
            </div>
        </div>
    );
}
