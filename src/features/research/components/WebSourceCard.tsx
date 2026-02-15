"use client";

import { motion } from 'framer-motion';
import { ExternalLink, Globe } from 'lucide-react';

export interface WebSource {
  id: string;
  sourceType: 'WEB';
  title: string;
  snippet: string | null;
  fileUrl: string;
}

interface WebSourceCardProps {
  source: WebSource;
}

export function WebSourceCard({ source }: WebSourceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <a
          href={source.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <h3 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
            {source.title}
          </h3>
        </a>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-300 rounded-full text-xs shrink-0">
          <Globe className="w-3 h-3" />
          Web
        </span>
      </div>

      {/* Snippet */}
      {source.snippet && (
        <p className="mt-2 text-xs text-gray-400 leading-relaxed line-clamp-3">
          {source.snippet}
        </p>
      )}

      {/* Domain */}
      <div className="mt-2 text-xs text-gray-500 truncate">
        {new URL(source.fileUrl).hostname}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <a
          href={source.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Source
        </a>
      </div>
    </motion.div>
  );
}
