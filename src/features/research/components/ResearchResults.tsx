"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Globe, Loader2, Inbox, Filter, Unlock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicPaperCard, AcademicPaper } from './AcademicPaperCard';
import { WebSourceCard, WebSource } from './WebSourceCard';

type TabType = 'papers' | 'web';
type AccessFilter = 'all' | 'open' | 'paywalled';

interface ResearchDocument {
  id: string;
  sourceType: string;
  title: string | null;
  fileUrl: string | null;
  authors?: string | null;
  year?: string | null;
  citationCount?: number | null;
  abstractText?: string | null;
  openAccessUrl?: string | null;
  venue?: string | null;
  snippet?: string | null;
}

interface ResearchResultsProps {
  documents: ResearchDocument[];
  isLoading?: boolean;
  className?: string;
}

export function ResearchResults({ documents, isLoading, className }: ResearchResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('papers');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');

  const { papers, webSources, openCount, paywalledCount } = useMemo(() => {
    const papers: AcademicPaper[] = [];
    const webSources: WebSource[] = [];
    let openCount = 0;
    let paywalledCount = 0;

    for (const doc of documents) {
      if (doc.sourceType === 'ACADEMIC') {
        const paper: AcademicPaper = {
          id: doc.id,
          sourceType: 'ACADEMIC',
          title: doc.title || 'Untitled Paper',
          authors: doc.authors || null,
          year: doc.year || null,
          citationCount: doc.citationCount || null,
          abstractText: doc.abstractText || null,
          openAccessUrl: doc.openAccessUrl || null,
          fileUrl: doc.fileUrl || '#',
          venue: doc.venue || null,
        };
        papers.push(paper);
        
        // Count open access vs paywalled
        if (paper.openAccessUrl && paper.openAccessUrl.length > 0) {
          openCount++;
        } else {
          paywalledCount++;
        }
      } else {
        webSources.push({
          id: doc.id,
          sourceType: 'WEB',
          title: doc.title || 'Untitled Source',
          snippet: doc.snippet || null,
          fileUrl: doc.fileUrl || '#',
        });
      }
    }

    // Sort papers by citation count descending
    papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

    return { papers, webSources, openCount, paywalledCount };
  }, [documents]);

  // Apply access filter to papers
  const filteredPapers = useMemo(() => {
    if (accessFilter === 'all') return papers;
    return papers.filter(paper => {
      const hasOpenAccess = paper.openAccessUrl && paper.openAccessUrl.length > 0;
      return accessFilter === 'open' ? hasOpenAccess : !hasOpenAccess;
    });
  }, [papers, accessFilter]);

  const tabs = [
    { id: 'papers' as TabType, label: 'Papers', count: papers.length, icon: FileText },
    { id: 'web' as TabType, label: 'Web Sources', count: webSources.length, icon: Globe },
  ];

  const accessFilters = [
    { id: 'all' as AccessFilter, label: 'All', count: papers.length, icon: Filter },
    { id: 'open' as AccessFilter, label: 'Free PDF', count: openCount, icon: Unlock },
    { id: 'paywalled' as AccessFilter, label: 'Paywalled', count: paywalledCount, icon: Lock },
  ];

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading research results...</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Inbox className="w-12 h-12 opacity-50" />
          <span className="text-sm">No research documents found</span>
          <span className="text-xs text-gray-500">Run a research query to find sources</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-xs',
              activeTab === tab.id ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Access Filter (only show on papers tab) */}
      {activeTab === 'papers' && papers.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg mb-4 border border-white/5">
          {accessFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setAccessFilter(filter.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                accessFilter === filter.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <filter.icon className="w-3 h-3" />
              {filter.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px]',
                accessFilter === filter.id 
                  ? filter.id === 'open' 
                    ? 'bg-green-500/20 text-green-300'
                    : filter.id === 'paywalled'
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-white/10 text-gray-300'
                  : 'bg-white/5 text-gray-500'
              )}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'papers' && (
          <motion.div
            key="papers"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {filteredPapers.length > 0 ? (
              filteredPapers.map((paper) => (
                <AcademicPaperCard key={paper.id} paper={paper} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No papers match the selected filter
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'web' && (
          <motion.div
            key="web"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            {webSources.length > 0 ? (
              webSources.map((source) => (
                <WebSourceCard key={source.id} source={source} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No web sources found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
