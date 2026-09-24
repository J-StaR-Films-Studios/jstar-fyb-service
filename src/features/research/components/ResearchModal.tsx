"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, Check, ArrowRight, Loader2, Sparkles, X, BookOpen, Globe,
  Search, FileText, Quote, Download, Lock, ExternalLink, AlertCircle,
  ListChecks, CheckSquare, Square, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchClient, ResearchPlan, SearchResults } from '@/services/researchClient';
import { ResearchProgress as ProgressType } from '../services/researchService';
import { SemanticScholarPaper } from '../services/semanticScholarService';
import { GroundedWebSource } from '../services/geminiService';
import { useBuilderStore } from '@/features/builder/store/useBuilderStore';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTopic?: string;
  onComplete?: (savedDocs?: any[], syncAfter?: boolean) => void;
}

type Step = 'configure' | 'planning' | 'review' | 'executing' | 'curate';

// ── Selection Caps ──────────────────────────────────────
const CAPS = {
  FREE_PAPERS: 10,
  PAYWALLED_PAPERS: 10,
  WEB: 5,
} as const;

export function ResearchModal({ isOpen, onClose, projectId, projectTopic, onComplete }: ResearchModalProps) {
  const [step, setStep] = useState<Step>('configure');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ResearchPlan | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [logs, setLogs] = useState<ProgressType[]>([]);
  const [currentStep, setCurrentStep] = useState<ProgressType['step']>('planning');

  // Curation state
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [selectedWebIds, setSelectedWebIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get project data
  const projectData = useBuilderStore((state) => state.data);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setStep('planning');

    try {
      const plan = await ResearchClient.generatePlan(projectId);
      setGeneratedPlan(plan);
      setStep('review');
    } catch (error) {
      console.error(error);
      setLogs([{ step: 'failed', message: 'Failed to generate research plan. Please try again.' }]);
      setStep('configure');
    } finally {
      setIsLoading(false);
    }
  };

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

      // Store results and auto-select up to caps
      setSearchResults(results);

      // Split academic into free vs paywalled, pick top N of each
      const freePapers = results.academic.filter(p => p.openAccessPdfUrl);
      const paywalledPapers = results.academic.filter(p => !p.openAccessPdfUrl);
      const autoSelectedPaperIds = [
        ...freePapers.slice(0, CAPS.FREE_PAPERS).map(p => p.paperId),
        ...paywalledPapers.slice(0, CAPS.PAYWALLED_PAPERS).map(p => p.paperId),
      ];
      setSelectedPaperIds(new Set(autoSelectedPaperIds));
      setSelectedWebIds(new Set(results.web.slice(0, CAPS.WEB).map(w => w.url)));

      setStep('curate');

    } catch (error) {
      setLogs(prev => [...prev, { step: 'failed', message: 'Research execution failed unexpectedly.' }]);
    }
  };

  // --- Curation Helpers (with cap enforcement) ---

  // Helpers to count selected free vs paywalled
  const getSelectedCounts = (paperIds: Set<string>) => {
    if (!searchResults) return { free: 0, paywalled: 0 };
    let free = 0, paywalled = 0;
    for (const id of paperIds) {
      const paper = searchResults.academic.find(p => p.paperId === id);
      if (paper?.openAccessPdfUrl) free++;
      else paywalled++;
    }
    return { free, paywalled };
  };

  const togglePaper = (paperId: string) => {
    setSelectedPaperIds(prev => {
      const next = new Set(prev);
      if (next.has(paperId)) {
        next.delete(paperId);
      } else {
        // Enforce cap: check if this paper is free or paywalled
        const paper = searchResults?.academic.find(p => p.paperId === paperId);
        const counts = getSelectedCounts(prev);
        if (paper?.openAccessPdfUrl && counts.free >= CAPS.FREE_PAPERS) return prev;
        if (!paper?.openAccessPdfUrl && counts.paywalled >= CAPS.PAYWALLED_PAPERS) return prev;
        next.add(paperId);
      }
      return next;
    });
  };

  const toggleWeb = (url: string) => {
    setSelectedWebIds(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        if (prev.size >= CAPS.WEB) return prev; // Enforce cap
        next.add(url);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!searchResults) return;
    const freePapers = searchResults.academic.filter(p => p.openAccessPdfUrl);
    const paywalledPapers = searchResults.academic.filter(p => !p.openAccessPdfUrl);
    setSelectedPaperIds(new Set([
      ...freePapers.slice(0, CAPS.FREE_PAPERS).map(p => p.paperId),
      ...paywalledPapers.slice(0, CAPS.PAYWALLED_PAPERS).map(p => p.paperId),
    ]));
    setSelectedWebIds(new Set(searchResults.web.slice(0, CAPS.WEB).map(w => w.url)));
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
    const freePaperIds = searchResults.academic
      .filter(p => p.openAccessPdfUrl)
      .slice(0, CAPS.FREE_PAPERS)
      .map(p => p.paperId);
    setSelectedPaperIds(new Set(freePaperIds));
    setSelectedWebIds(new Set(searchResults.web.slice(0, CAPS.WEB).map(w => w.url)));
  };

  const deselectWeb = () => {
    setSelectedWebIds(new Set());
  };

  const totalSelected = selectedPaperIds.size + selectedWebIds.size;
  const totalResults = (searchResults?.academic.length || 0) + (searchResults?.web.length || 0);
  const selectedCounts = getSelectedCounts(selectedPaperIds);
  const totalCap = CAPS.FREE_PAPERS + CAPS.PAYWALLED_PAPERS + CAPS.WEB;

  const handleSaveSelected = async (syncAfter: boolean) => {
    if (!searchResults) return;
    setIsSaving(true);

    try {
      const selectedPapers = searchResults.academic.filter(p => selectedPaperIds.has(p.paperId));
      const selectedSources = searchResults.web.filter(w => selectedWebIds.has(w.url));

      const data = await ResearchClient.saveSelected(projectId, selectedPapers, selectedSources);

      // The parent component (FloatingResearchPanel) will handle the synchronization
      // to avoid Vercel timeouts and Gemini rate limits by processing one by one
      onComplete?.(data.savedDocs, syncAfter);
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  };

  // Reset state when modal opens
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

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDone = logs.some(l => l.step === 'completed');
  const hasError = logs.some(l => l.step === 'failed');

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="font-margin text-ink bg-writing border border-rule rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rule bg-selection">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-selection flex items-center justify-center">
              <Search className="w-5 h-5 text-rust" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Deep Research</h2>
              <p className="text-xs text-ink-muted">Semantic Scholar + Gemini Grounding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-selection rounded-lg text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-5 py-3 border-b border-rule bg-paper">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {['configure', 'planning', 'review', 'executing', 'curate'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === s ? "bg-rust text-writing" :
                    ['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? "bg-ink text-writing" :
                      "bg-selection text-ink-muted"
                )}>
                  {['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < 4 && (
                  <div className={cn(
                    "w-8 h-0.5 transition-colors",
                    ['planning', 'review', 'executing', 'curate'].indexOf(step) > i ? "bg-ink" : "bg-selection"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between max-w-sm mx-auto mt-1.5">
            <span className="text-xs text-ink-muted w-10 text-center">Setup</span>
            <span className="text-xs text-ink-muted w-10 text-center">Plan</span>
            <span className="text-xs text-ink-muted w-10 text-center">Review</span>
            <span className="text-xs text-ink-muted w-10 text-center">Search</span>
            <span className="text-xs text-ink-muted w-10 text-center">Curate</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* Configure Step */}
            {step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Info Card */}
                <div className="bg-selection border border-rule rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 mt-0.5">
                      <BookOpen className="w-4 h-4 text-ink" />
                      <Globe className="w-4 h-4 text-rust" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-ink mb-1">Hybrid Search</h4>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Searches <span className="text-ink">Semantic Scholar</span> for academic papers
                        and <span className="text-ink">Gemini Grounding</span> for web sources simultaneously.
                        Results are saved as metadata — no file downloads.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                {projectData.topic && (
                  <div className="bg-paper border border-rule rounded-xl p-4">
                    <label className="text-xs text-ink-muted mb-1 block">Current Project Topic</label>
                    <p className="text-sm text-ink">{projectData.topic}</p>
                    {projectData.twist && (
                      <p className="text-xs text-ink-muted mt-1">{projectData.twist}</p>
                    )}
                  </div>
                )}

                {/* Custom Goal */}
                <div>
                  <label className="text-xs text-ink-muted mb-1.5 block">
                    Research Focus <span className="text-ink-muted">(optional)</span>
                  </label>
                  <textarea
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder={projectTopic || "E.g. Focus on recent advances in deep learning for image classification..."}
                    rows={3}
                    className="w-full bg-paper border border-rule rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-rust transition-colors resize-none"
                  />
                  <p className="text-xs text-ink-muted mt-1">
                    Customize what the AI should focus on during research
                  </p>
                </div>
              </motion.div>
            )}

            {/* Planning Step */}
            {step === 'planning' && (
              <motion.div
                key="planning"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-selection flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-rust animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-ink mb-2">Generating Search Plan</h3>
                <p className="text-sm text-ink-muted text-center max-w-sm">
                  AI is analyzing your topic and creating targeted search queries for academic databases...
                </p>
              </motion.div>
            )}

            {/* Review Step */}
            {step === 'review' && generatedPlan && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-ink">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Search Plan Generated</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(generatedPlan).map(([key, queries]) => (
                    <div key={key} className="bg-paper border border-rule rounded-xl p-4">
                      <h5 className="text-xs font-bold text-ink-muted uppercase mb-3 flex items-center gap-2">
                        {key.includes('core') && <FileText className="w-3 h-3" />}
                        {key.includes('technical') && <Zap className="w-3 h-3" />}
                        {key.includes('context') && <Globe className="w-3 h-3" />}
                        {key.replace(/_/g, ' ')}
                      </h5>
                      <ul className="space-y-1.5">
                        {(queries as string[]).slice(0, 3).map((q, i) => (
                          <li key={i} className="text-xs text-ink pl-3 border-l-2 border-rust">
                            {q}
                          </li>
                        ))}
                        {(queries as string[]).length > 3 && (
                          <li className="text-xs text-ink-muted pl-3">
                            +{(queries as string[]).length - 3} more queries
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="bg-selection border border-rule rounded-xl p-3">
                  <p className="text-xs text-ink">
                    <strong>{Object.values(generatedPlan).flat().length} search queries</strong> will be executed
                    across Semantic Scholar and Gemini Grounding in parallel.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Executing Step */}
            {step === 'executing' && (
              <motion.div
                key="executing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {/* Terminal */}
                <div className="bg-paper border border-rule rounded-xl overflow-hidden font-mono text-xs">
                  <div className="flex items-center gap-2 px-3 py-2 bg-selection border-b border-rule">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rust" />
                      <div className="w-2.5 h-2.5 rounded-full bg-ink-muted" />
                      <div className="w-2.5 h-2.5 rounded-full bg-ink/50" />
                    </div>
                    <span className="text-ink-muted text-xs">Research Terminal</span>
                    {isDone && <span className="text-ink text-xs ml-auto">✓ Complete</span>}
                    {hasError && <span className="text-ink text-xs ml-auto">✗ Failed</span>}
                    {!isDone && !hasError && (
                      <span className="text-ink text-xs ml-auto flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Running
                      </span>
                    )}
                  </div>
                  <div className="h-48 overflow-y-auto p-3 space-y-1.5">
                    {logs.length === 0 && (
                      <div className="text-ink-muted italic">Initializing...</div>
                    )}
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-ink-muted shrink-0">&gt;</span>
                        <span className={cn(
                          "break-words",
                          log.step === 'failed' ? "text-ink" :
                            log.step === 'completed' ? "text-ink" :
                              log.step === 'processing' ? "text-ink" :
                                "text-ink"
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {!isDone && !hasError && (
                      <div className="flex gap-2">
                        <span className="text-ink-muted">&gt;</span>
                        <span className="w-2 h-4 bg-rust animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {isDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-selection border border-rule rounded-xl p-4 text-center"
                  >
                    <Check className="w-8 h-8 text-ink mx-auto mb-2" />
                    <p className="text-sm text-ink font-medium">Research Complete!</p>
                    <p className="text-xs text-ink-muted mt-1">Documents saved to your Research Library</p>
                  </motion.div>
                )}
              </motion.div>
            )}

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
                    <ListChecks className="w-4 h-4 text-rust" />
                    <span className="text-ink font-medium">
                      {totalSelected} selected
                    </span>
                    <span className="text-xs text-ink-muted">
                      (max {totalCap})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-ink">{selectedCounts.free}/{CAPS.FREE_PAPERS} free</span>
                    <span className="text-ink-muted">·</span>
                    <span className="text-ink">{selectedCounts.paywalled}/{CAPS.PAYWALLED_PAPERS} paywalled</span>
                    <span className="text-ink-muted">·</span>
                    <span className="text-ink">{selectedWebIds.size}/{CAPS.WEB} web</span>
                  </div>
                </div>

                {/* Bulk action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs bg-selection hover:bg-selection border border-rule rounded-lg text-ink transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 text-xs bg-selection hover:bg-selection border border-rule rounded-lg text-ink transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={deselectPaywalled}
                    className="px-3 py-1.5 text-xs bg-paper hover:bg-selection border border-rule rounded-lg text-ink transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3 h-3" />
                    Deselect Paywalled
                  </button>
                  <button
                    onClick={selectFreeOnly}
                    className="px-3 py-1.5 text-xs bg-selection hover:bg-selection border border-rule rounded-lg text-ink transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    Free Only
                  </button>
                  <button
                    onClick={deselectWeb}
                    className="px-3 py-1.5 text-xs bg-selection hover:bg-selection border border-rule rounded-lg text-ink transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3 h-3" />
                    Deselect Web
                  </button>
                </div>

                {/* Academic Papers */}
                {searchResults.academic.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-ink-muted uppercase mb-2 flex items-center gap-2">
                      <BookOpen className="w-3 h-3" />
                      Academic Papers ({searchResults.academic.length})
                      <span className="text-xs font-normal text-ink-muted normal-case">
                        — max {CAPS.FREE_PAPERS} free + {CAPS.PAYWALLED_PAPERS} paywalled
                      </span>
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
                                ? "bg-selection border-rust"
                                : "bg-paper border-rule"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={cn(
                                "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-rust border-rust" : "border-rule"
                              )}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-writing" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-ink font-medium leading-snug line-clamp-2">{paper.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {paper.year && <span className="text-xs text-ink-muted">{paper.year}</span>}
                                  {paper.citationCount > 0 && (
                                    <span className="text-xs text-ink-muted">{paper.citationCount} citations</span>
                                  )}
                                  {hasOpen ? (
                                    <span className="text-xs text-ink bg-selection px-1.5 py-0.5 rounded">Free PDF</span>
                                  ) : (
                                    <span className="text-xs text-ink bg-paper px-1.5 py-0.5 rounded flex items-center gap-0.5">
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
                    <h4 className="text-xs font-bold text-ink-muted uppercase mb-2 flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      Web Sources ({searchResults.web.length})
                      <span className="text-xs font-normal text-ink-muted normal-case">
                        — max {CAPS.WEB}
                      </span>
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
                                ? "bg-selection border-rust"
                                : "bg-paper border-rule"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={cn(
                                "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-rust border-rust" : "border-rule"
                              )}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-writing" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-ink font-medium leading-snug line-clamp-2">{source.title}</p>
                                <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{source.snippet}</p>
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
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-rule gap-2 bg-paper">
          {step === 'configure' && (
            <button
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className="flex items-center gap-2 bg-rust hover:bg-rust/90 text-writing px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-75"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Generate Search Plan
            </button>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-selection transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleExecute}
                className="flex items-center gap-2 bg-rust hover:bg-rust/90 text-writing px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" />
                Execute Research
              </button>
            </>
          )}

          {step === 'executing' && hasError && (
            <button
              onClick={onClose}
              className="bg-selection text-ink hover:bg-selection px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Close
            </button>
          )}

          {step === 'curate' && (
            <>
              <button
                onClick={() => setStep('executing')}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-selection transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleSaveSelected(false)}
                disabled={totalSelected === 0 || isSaving}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-ink hover:text-ink bg-selection hover:bg-selection border border-rule transition-colors disabled:opacity-75"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save ${totalSelected} Selected`}
              </button>
              <button
                onClick={() => handleSaveSelected(true)}
                disabled={totalSelected === 0 || isSaving}
                className="flex items-center gap-2 bg-rust hover:bg-rust/90 text-writing px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-75"
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
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
