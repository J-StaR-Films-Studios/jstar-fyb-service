"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Download, Lock, Quote, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AcademicPaper {
  id: string;
  sourceType: 'ACADEMIC';
  title: string;
  authors: string | null;
  year: string | null;
  citationCount: number | null;
  abstractText: string | null;
  openAccessUrl: string | null;
  fileUrl: string;
  venue: string | null;
}

interface AcademicPaperCardProps {
  paper: AcademicPaper;
}

export function AcademicPaperCard({ paper }: AcademicPaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const authorList = paper.authors?.split(',').map(a => a.trim()) || [];
  const displayAuthors = authorList.length > 3
    ? `${authorList.slice(0, 3).join(', ')} et al.`
    : authorList.join(', ');

  const hasOpenAccess = paper.openAccessUrl && paper.openAccessUrl.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <a
          href={paper.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <h3 className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
            {paper.title}
          </h3>
        </a>
        <span className="text-xs text-gray-500 shrink-0">{paper.year || 'n.d.'}</span>
      </div>

      {/* Meta Row */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        {displayAuthors && (
          <span className="truncate max-w-[200px]">{displayAuthors}</span>
        )}
        {paper.venue && (
          <>
            <span className="text-gray-600">•</span>
            <span className="italic truncate max-w-[150px]">{paper.venue}</span>
          </>
        )}
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {paper.citationCount !== null && paper.citationCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full text-xs">
            <Quote className="w-3 h-3" />
            {paper.citationCount.toLocaleString()} citations
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded-full text-xs">
          <BookOpen className="w-3 h-3" />
          Academic
        </span>
      </div>

      {/* Abstract (Collapsible) */}
      {paper.abstractText && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {isExpanded ? 'Hide abstract' : 'Show abstract'}
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  {paper.abstractText}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {hasOpenAccess ? (
          <a
            href={paper.openAccessUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-300 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 text-gray-400 rounded-lg text-xs">
            <Lock className="w-3.5 h-3.5" />
            Paywalled
          </span>
        )}
        <a
          href={paper.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>
      </div>
    </motion.div>
  );
}
