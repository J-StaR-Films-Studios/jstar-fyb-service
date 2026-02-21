# Task: Add Curation Step to ResearchModal

**Session ID:** org-20250219-research-curation-sync
**Source:** Orchestrator
**Priority:** P0
**Dependencies:** Task 04 (`04_frontend_client.task.md`) must be completed first
**Created At:** 2026-02-19T01:00:00+01:00

---

## 📋 Objective

Modify `ResearchModal.tsx` to add a new **curation step** between "executing" and completion. After the search finishes, users see a list of found papers with checkboxes and can select which ones to save.

## 🎯 Target File

**`src/features/research/components/ResearchModal.tsx`** (currently 419 lines)

## 📚 Critical Context

### Current Step Flow (line 23)
```typescript
type Step = 'configure' | 'planning' | 'review' | 'executing';
```

### Current Imports (lines 1-13)
```typescript
"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, Check, ArrowRight, Loader2, Sparkles, X, BookOpen, Globe,
  Search, FileText, Quote, Download, Lock, ExternalLink, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchClient, ResearchPlan } from '@/services/researchClient';
import { ResearchProgress as ProgressType } from '../services/researchService';
import { useBuilderStore } from '@/features/builder/store/useBuilderStore';
```

### Current State (lines 26-31)
```typescript
const [step, setStep] = useState<Step>('configure');
const [isLoading, setIsLoading] = useState(false);
const [generatedPlan, setGeneratedPlan] = useState<ResearchPlan | null>(null);
const [customGoal, setCustomGoal] = useState('');
const [logs, setLogs] = useState<ProgressType[]>([]);
const [currentStep, setCurrentStep] = useState<ProgressType['step']>('planning');
```

### Current Execute Handler (lines 53-81)
```typescript
const handleExecute = async () => {
  setStep('executing');
  setLogs([]);
  try {
    let queries: string[] = [];
    if (generatedPlan) {
      queries = [...generatedPlan.core_problem_queries, ...generatedPlan.technical_queries, ...generatedPlan.context_queries];
    }
    const goal = customGoal || projectTopic || projectData.topic || 'Academic research';
    await ResearchClient.executeResearch(projectId, { queries, deepGoal: goal }, (progress) => {
      setLogs(prev => [...prev, progress]);
      setCurrentStep(progress.step);
    });
  } catch (error) {
    setLogs(prev => [...prev, { step: 'failed', message: 'Research execution failed unexpectedly.' }]);
  }
};
```

### Progress Stepper (lines 140-164)
Currently shows 4 steps: Setup, Plan, Review, Search

### Done Button (lines 395-412)
When done, calls `onComplete?.()` then `onClose()`.

### Key types from Task 04 (new imports needed):
```typescript
// From src/services/researchClient.ts (after Task 04 is done)
import { ResearchClient, ResearchPlan, SearchResults } from '@/services/researchClient';

// From services
import { SemanticScholarPaper } from '../services/semanticScholarService';
import { GroundedWebSource } from '../services/geminiService';
```

---

## ✅ Changes to Make

### 1. Update Step type (line 23)

```diff
- type Step = 'configure' | 'planning' | 'review' | 'executing';
+ type Step = 'configure' | 'planning' | 'review' | 'executing' | 'curate';
```

### 2. Update imports (lines 6-12)

Add `ListChecks`, `CheckSquare`, `Square`, `Filter` to lucide-react imports.

Update the ResearchClient import:
```diff
- import { ResearchClient, ResearchPlan } from '@/services/researchClient';
+ import { ResearchClient, ResearchPlan, SearchResults } from '@/services/researchClient';
```

Add type imports:
```typescript
import { SemanticScholarPaper } from '../services/semanticScholarService';
import { GroundedWebSource } from '../services/geminiService';
```

### 3. Add new state variables (after line 31)

```typescript
// Curation state
const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
const [selectedWebIds, setSelectedWebIds] = useState<Set<string>>(new Set());
const [isSaving, setIsSaving] = useState(false);
const [isSyncing, setIsSyncing] = useState(false);
```

### 4. Replace `handleExecute` (lines 53-81)

Replace the entire handler to use `searchOnly` instead of `executeResearch`:

```typescript
const handleExecute = async () => {
  setStep('executing');
  setLogs([]);

  try {
    let queries: string[] = [];
    if (generatedPlan) {
      queries = [
        ...generatedPlan.core_problem_queries,
        ...generatedPlan.technical_queries,
        ...generatedPlan.context_queries
      ];
    }

    const goal = customGoal || projectTopic || projectData.topic || 'Academic research';

    // Use searchOnly() — does NOT save to DB
    const results = await ResearchClient.searchOnly(
      projectId,
      { queries, deepGoal: goal },
      (progress: ProgressType) => {
        setLogs(prev => [...prev, progress]);
        setCurrentStep(progress.step);
      }
    );

    // Store results and select ALL by default
    setSearchResults(results);
    setSelectedPaperIds(new Set(results.academic.map(p => p.paperId)));
    setSelectedWebIds(new Set(results.web.map(w => w.url)));
    setStep('curate');

  } catch (error) {
    setLogs(prev => [...prev, { step: 'failed', message: 'Research execution failed unexpectedly.' }]);
  }
};
```

### 5. Add curation helper functions (after handleExecute)

```typescript
// --- Curation Helpers ---

const togglePaper = (paperId: string) => {
  setSelectedPaperIds(prev => {
    const next = new Set(prev);
    if (next.has(paperId)) next.delete(paperId);
    else next.add(paperId);
    return next;
  });
};

const toggleWeb = (url: string) => {
  setSelectedWebIds(prev => {
    const next = new Set(prev);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    return next;
  });
};

const selectAll = () => {
  if (!searchResults) return;
  setSelectedPaperIds(new Set(searchResults.academic.map(p => p.paperId)));
  setSelectedWebIds(new Set(searchResults.web.map(w => w.url)));
};

const deselectAll = () => {
  setSelectedPaperIds(new Set());
  setSelectedWebIds(new Set());
};

const deselectPaywalled = () => {
  if (!searchResults) return;
  setSelectedPaperIds(prev => {
    const next = new Set(prev);
    for (const paper of searchResults.academic) {
      if (!paper.openAccessPdfUrl) {
        next.delete(paper.paperId);
      }
    }
    return next;
  });
};

const selectFreeOnly = () => {
  if (!searchResults) return;
  // Select only academic papers with open access, and all web sources
  const freePaperIds = searchResults.academic
    .filter(p => p.openAccessPdfUrl)
    .map(p => p.paperId);
  setSelectedPaperIds(new Set(freePaperIds));
  setSelectedWebIds(new Set(searchResults.web.map(w => w.url)));
};

const totalSelected = selectedPaperIds.size + selectedWebIds.size;
const totalResults = (searchResults?.academic.length || 0) + (searchResults?.web.length || 0);

const handleSaveSelected = async (syncAfter: boolean) => {
  if (!searchResults) return;
  setIsSaving(true);

  try {
    const selectedPapers = searchResults.academic.filter(p => selectedPaperIds.has(p.paperId));
    const selectedSources = searchResults.web.filter(w => selectedWebIds.has(w.url));

    await ResearchClient.saveSelected(projectId, selectedPapers, selectedSources);

    if (syncAfter) {
      setIsSyncing(true);
      try {
        await fetch(`/api/projects/${projectId}/research/sync`, { method: 'POST' });
      } catch (e) {
        console.error('Sync failed:', e);
      }
      setIsSyncing(false);
    }

    onComplete?.();
    onClose();
  } catch (error) {
    console.error('Save failed:', error);
    setIsSaving(false);
  }
};
```

### 6. Update the reset effect (lines 84-91)

Add the new state resets:
```typescript
useEffect(() => {
  if (isOpen) {
    setStep('configure');
    setLogs([]);
    setGeneratedPlan(null);
    setCustomGoal('');
    setSearchResults(null);
    setSelectedPaperIds(new Set());
    setSelectedWebIds(new Set());
    setIsSaving(false);
    setIsSyncing(false);
  }
}, [isOpen]);
```

### 7. Update the Progress Stepper (lines 138-165)

Change from 4 steps to 5 steps:
```typescript
{['configure', 'planning', 'review', 'executing', 'curate'].map((s, i) => (
  <div key={s} className="flex items-center">
    <div className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
      step === s ? "bg-purple-500 text-white" :
      ['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? "bg-green-500 text-white" :
      "bg-white/10 text-gray-500"
    )}>
      {['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? <Check className="w-3 h-3" /> : i + 1}
    </div>
    {i < 4 && (
      <div className={cn(
        "w-8 h-0.5 transition-colors",
        ['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? "bg-green-500" : "bg-white/10"
      )} />
    )}
  </div>
))}

{/* Labels */}
<div className="flex items-center justify-between max-w-sm mx-auto mt-1.5">
  <span className="text-[10px] text-gray-500 w-10 text-center">Setup</span>
  <span className="text-[10px] text-gray-500 w-10 text-center">Plan</span>
  <span className="text-[10px] text-gray-500 w-10 text-center">Review</span>
  <span className="text-[10px] text-gray-500 w-10 text-center">Search</span>
  <span className="text-[10px] text-gray-500 w-10 text-center">Curate</span>
</div>
```

### 8. Add the Curate Step Content (after the executing step in the AnimatePresence)

Insert this after the `{/* Executing Step */}` block and before `</AnimatePresence>`:

```tsx
{/* Curate Step */}
{step === 'curate' && searchResults && (
  <motion.div
    key="curate"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="space-y-4"
  >
    {/* Stats bar */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <ListChecks className="w-4 h-4 text-purple-400" />
        <span className="text-white font-medium">
          {totalSelected} of {totalResults} selected
        </span>
      </div>
    </div>

    {/* Bulk action buttons */}
    <div className="flex flex-wrap gap-2">
      <button
        onClick={selectAll}
        className="px-3 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors"
      >
        Select All
      </button>
      <button
        onClick={deselectAll}
        className="px-3 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors"
      >
        Deselect All
      </button>
      <button
        onClick={deselectPaywalled}
        className="px-3 py-1.5 text-[11px] bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-orange-300 transition-colors flex items-center gap-1.5"
      >
        <Lock className="w-3 h-3" />
        Deselect Paywalled
      </button>
      <button
        onClick={selectFreeOnly}
        className="px-3 py-1.5 text-[11px] bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-green-300 transition-colors flex items-center gap-1.5"
      >
        <Download className="w-3 h-3" />
        Free Only
      </button>
    </div>

    {/* Academic Papers */}
    {searchResults.academic.length > 0 && (
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <BookOpen className="w-3 h-3" />
          Academic Papers ({searchResults.academic.length})
        </h4>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {searchResults.academic.map((paper) => {
            const isSelected = selectedPaperIds.has(paper.paperId);
            const hasOpen = !!paper.openAccessPdfUrl;
            return (
              <button
                key={paper.paperId}
                onClick={() => togglePaper(paper.paperId)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                  isSelected
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-purple-500 border-purple-500" : "border-white/20"
                  )}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-medium leading-snug line-clamp-2">{paper.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {paper.year && <span className="text-[10px] text-gray-500">{paper.year}</span>}
                      {paper.citationCount > 0 && (
                        <span className="text-[10px] text-gray-500">{paper.citationCount} citations</span>
                      )}
                      {hasOpen ? (
                        <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Free PDF</span>
                      ) : (
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Paywalled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* Web Sources */}
    {searchResults.web.length > 0 && (
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <Globe className="w-3 h-3" />
          Web Sources ({searchResults.web.length})
        </h4>
        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
          {searchResults.web.map((source) => {
            const isSelected = selectedWebIds.has(source.url);
            return (
              <button
                key={source.url}
                onClick={() => toggleWeb(source.url)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                  isSelected
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-blue-500 border-blue-500" : "border-white/20"
                  )}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-medium leading-snug line-clamp-2">{source.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{source.snippet}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </motion.div>
)}
```

### 9. Update the Footer buttons (lines 364-413)

**Remove** the existing `isDone` button block and replace the executing step footer with:

```tsx
{step === 'executing' && hasError && (
  <button
    onClick={onClose}
    className="bg-white/10 text-white hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
  >
    Close
  </button>
)}

{step === 'curate' && (
  <>
    <button
      onClick={() => setStep('executing')}
      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      Back
    </button>
    <button
      onClick={() => handleSaveSelected(false)}
      disabled={totalSelected === 0 || isSaving}
      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
    >
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save ${totalSelected} Selected`}
    </button>
    <button
      onClick={() => handleSaveSelected(true)}
      disabled={totalSelected === 0 || isSaving}
      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
    >
      {isSyncing ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</>
      ) : isSaving ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
      ) : (
        <><Sparkles className="w-4 h-4" /> Save & Sync to AI</>
      )}
    </button>
  </>
)}
```

## ⚠️ Common Mistakes to Avoid

1. **Do NOT** forget to update the `useEffect` reset (include all new state)
2. **Do NOT** leave the old `isDone` button that calls `onComplete` + `onClose` — this is replaced by the curate step
3. **Keep** the old executing terminal UI — it still shows search progress. Only remove the old "Research Complete!" summary that shows when `isDone` is true, since we now transition to curate instead.
4. **Watch line counts** — view the file first, match exact line ranges
5. The `ListChecks` icon must be imported from `lucide-react`
6. The `searchResults` type comes from `SearchResults` in `researchClient.ts` (Task 04)

## 🚫 Constraints

- Do NOT add any new npm packages
- Do NOT modify the configure, planning, or review steps
- Do NOT remove the executing step's terminal UI (search progress terminal stays)
- The modal width stays `max-w-2xl`
- Keep all existing animation patterns (`motion.div` with the same enter/exit animations)

## ✅ Definition of Done

- [ ] `Step` type includes `'curate'`
- [ ] New state: `searchResults`, `selectedPaperIds`, `selectedWebIds`, `isSaving`, `isSyncing`
- [ ] `handleExecute` calls `searchOnly()` instead of `executeResearch()`
- [ ] All 6 curation helpers implemented (`togglePaper`, `toggleWeb`, `selectAll`, `deselectAll`, `deselectPaywalled`, `selectFreeOnly`)
- [ ] `handleSaveSelected(syncAfter)` implemented
- [ ] Progress stepper shows 5 steps
- [ ] Curate step renders paper list with checkboxes
- [ ] Bulk action buttons work
- [ ] Footer shows "Save Selected" and "Save & Sync to AI" buttons in curate step
- [ ] Reset effect clears all new state
- [ ] `npx tsc --noEmit` passes

---

*Generated by /mode-orchestrator*
