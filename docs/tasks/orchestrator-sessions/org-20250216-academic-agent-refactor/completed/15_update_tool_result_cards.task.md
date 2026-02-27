# Task: Update ToolResultCard and Suggestion Cards

**Session ID:** org-20250216-academic-agent-refactor  
**Source:** Orchestrator  
**Context:** Master Plan Phase 6 - Frontend Updates  
**Priority:** P1  
**Dependencies:** 14_update_message_bubble.task.md  
**Created At:** 2026-02-16

---

## 📋 Objective

Update `ToolResultCard.tsx`, `EditSuggestionCard.tsx`, and `DiagramSuggestionCard.tsx` to handle the new tool output structure (`ToolSuccess`/`ToolError` wrapper) and typed tool invocations.

---

## 🎯 Scope

**In Scope:**
- Update `ToolResultCard.tsx` as the generic tool result renderer
- Update `EditSuggestionCard.tsx` to handle `ToolSuccess<SuggestEditOutput>`
- Update `DiagramSuggestionCard.tsx` to handle `ToolSuccess<GenerateDiagramOutput>`
- Handle `input` and `output` as separate props
- Handle error states gracefully

**Out of Scope:**
- AcademicCopilot changes
- Message bubble changes

---

## 📚 Context

### New Output Structure

Tools return `ToolResult<T>`:
```typescript
// From suggest-edit.ts
interface SuggestEditOutput {
  chapterNumber: number;
  original: string;
  replacement: string;
  explanation: string;
}

// From generate-diagram.ts
interface GenerateDiagramOutput {
  title: string;
  type: DiagramType;
  mermaidCode: string;
  explanation: string;
}
```

### Access Pattern
```typescript
// In message bubble, we extract and pass:
<ToolResultCard
  toolName={toolName}
  input={part.input}
  output={output.data}  // Unwrapped from ToolSuccess
  message={output.message}
/>
```

---

## 🔧 Implementation

### 1. ToolResultCard.tsx (Generic Handler)

```typescript
// src/features/builder/components/v2/ToolResultCard.tsx
'use client';

import { FileText, GitBranch, BookOpen, Edit, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditSuggestionCard } from './EditSuggestionCard';
import { DiagramSuggestionCard } from './DiagramSuggestionCard';

interface ToolResultCardProps {
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  message?: string;
  onApplyEdit?: (chapterNumber: number, original: string, replacement: string) => void;
  onInsertDiagram?: (diagram: { mermaidCode: string; title: string }) => void;
}

/**
 * Generic tool result card that delegates to specific handlers
 * based on tool name.
 */
export function ToolResultCard({
  toolName,
  input,
  output,
  message,
  onApplyEdit,
  onInsertDiagram,
}: ToolResultCardProps) {
  // Tool-specific rendering
  switch (toolName) {
    case 'suggestEdit':
      return (
        <EditSuggestionCard
          chapterNumber={output.chapterNumber}
          originalContent={output.original}
          newContent={output.replacement}
          explanation={output.explanation}
          onApply={onApplyEdit ? (content) => 
            onApplyEdit(output.chapterNumber, output.original, content)
          : undefined}
          onReject={() => {}}
        />
      );

    case 'generateDiagram':
      return (
        <DiagramSuggestionCard
          title={output.title}
          type={output.type}
          mermaidCode={output.mermaidCode}
          explanation={output.explanation}
          onInsert={onInsertDiagram ? () => 
            onInsertDiagram({ mermaidCode: output.mermaidCode, title: output.title })
          : undefined}
          onSave={() => {}}
          onReject={() => {}}
        />
      );

    case 'searchProjectDocuments':
      return (
        <SearchResultCard
          query={input.query}
          text={output.text}
          sources={output.sources}
          hasDocuments={output.hasDocuments}
          message={message}
        />
      );

    case 'listChapters':
      return (
        <ChapterListCard
          chapters={output.chapters}
          hasChapters={output.hasChapters}
        />
      );

    case 'loadChapter':
      return (
        <ChapterLoadCard
          chapterNumber={output.chapterNumber}
          title={output.title}
          status={output.status}
          contentPreview={output.contentPreview}
          wordCount={output.wordCount}
        />
      );

    case 'generateSection':
      return (
        <SectionGeneratedCard
          chapterNumber={output.chapterNumber}
          sectionTitle={output.sectionTitle}
          isNewChapter={output.isNewChapter}
          totalWordCount={output.totalWordCount}
          message={message}
        />
      );

    case 'addChapter':
      return (
        <ChapterAddedCard
          number={output.number}
          title={output.title}
          message={message}
        />
      );

    case 'generateChapterOutline':
      return (
        <OutlineCard
          outline={output.outline}
          focus={output.focus}
        />
      );

    default:
      // Generic fallback for unknown tools
      return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium">{toolName}</span>
          </div>
          {message && <p className="text-sm text-gray-300">{message}</p>}
          <pre className="text-xs text-gray-500 mt-2 overflow-auto">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      );
  }
}

// ============================================================
// SUB-COMPONENTS FOR SPECIFIC TOOLS
// ============================================================

function SearchResultCard({ 
  query, 
  text, 
  sources, 
  hasDocuments,
  message 
}: {
  query: string;
  text: string;
  sources: any[];
  hasDocuments: boolean;
  message?: string;
}) {
  if (!hasDocuments) {
    return (
      <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
        <p className="text-sm text-amber-300">{message || 'No documents available'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-sm text-primary mb-3">
        <Search className="w-4 h-4" />
        <span className="font-medium">Search Results</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">Query: "{query}"</p>
      <p className="text-sm text-gray-300">{text}</p>
      {sources.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {sources.length} source(s) found
        </p>
      )}
    </div>
  );
}

function ChapterListCard({ 
  chapters, 
  hasChapters 
}: {
  chapters: Array<{ number: number; title: string; status: string }>;
  hasChapters: boolean;
}) {
  if (!hasChapters) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <p className="text-sm text-gray-400">No chapters found. Generate an outline to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-sm text-primary mb-3">
        <BookOpen className="w-4 h-4" />
        <span className="font-medium">Chapters</span>
      </div>
      <ul className="space-y-1">
        {chapters.map((c) => (
          <li key={c.number} className="text-sm text-gray-300 flex justify-between">
            <span>Ch {c.number}: {c.title}</span>
            <span className="text-xs text-gray-500">{c.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChapterLoadCard({
  chapterNumber,
  title,
  status,
  contentPreview,
  wordCount,
}: {
  chapterNumber: number;
  title: string;
  status: string;
  contentPreview: string;
  wordCount: number;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-sm text-primary mb-2">
        <FileText className="w-4 h-4" />
        <span className="font-medium">Chapter {chapterNumber}: {title}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{status} • {wordCount} words</p>
      <p className="text-sm text-gray-400 line-clamp-3">{contentPreview}</p>
    </div>
  );
}

function SectionGeneratedCard({
  chapterNumber,
  sectionTitle,
  isNewChapter,
  totalWordCount,
  message,
}: {
  chapterNumber: number;
  sectionTitle: string;
  isNewChapter: boolean;
  totalWordCount: number;
  message?: string;
}) {
  return (
    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
      <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
        <Plus className="w-4 h-4" />
        <span className="font-medium">Section Generated</span>
      </div>
      <p className="text-sm text-gray-300">
        "{sectionTitle}" saved to Chapter {chapterNumber}
        {isNewChapter && ' (new chapter created)'}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Chapter now has {totalWordCount} words
      </p>
      {message && <p className="text-xs text-gray-400 mt-2">{message}</p>}
    </div>
  );
}

function ChapterAddedCard({
  number,
  title,
  message,
}: {
  number: number;
  title: string;
  message?: string;
}) {
  return (
    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
      <div className="flex items-center gap-2 text-sm text-green-400">
        <BookOpen className="w-4 h-4" />
        <span className="font-medium">Chapter {number}: "{title}" created</span>
      </div>
      {message && <p className="text-xs text-gray-400 mt-2">{message}</p>}
    </div>
  );
}

function OutlineCard({
  outline,
  focus,
}: {
  outline: Array<{ number: number; title: string; description?: string }>;
  focus?: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-sm text-primary mb-3">
        <GitBranch className="w-4 h-4" />
        <span className="font-medium">Generated Outline</span>
      </div>
      {focus && (
        <p className="text-xs text-gray-500 mb-2">Focus: {focus}</p>
      )}
      <ol className="space-y-2">
        {outline.map((item) => (
          <li key={item.number} className="text-sm text-gray-300">
            <span className="font-medium">{item.number}.</span> {item.title}
            {item.description && (
              <p className="text-xs text-gray-500 ml-4">{item.description}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

### 2. Update EditSuggestionCard.tsx

The existing card should mostly work, but verify it handles the props correctly:
- `chapterNumber: number`
- `originalContent: string`
- `newContent: string`
- `explanation: string`

### 3. Update DiagramSuggestionCard.tsx

The existing card should mostly work, but verify it handles the props correctly:
- `title: string`
- `type: string`
- `mermaidCode: string`
- `explanation: string`

---

## ✅ Definition of Done

- [ ] `ToolResultCard.tsx` handles all tool types
- [ ] `EditSuggestionCard.tsx` compatible with new structure
- [ ] `DiagramSuggestionCard.tsx` compatible with new structure
- [ ] Error states handled gracefully
- [ ] Loading states handled
- [ ] TypeScript compiles without errors

---

## 📁 Expected Artifacts

| File | Purpose |
|------|---------|
| `src/features/builder/components/v2/ToolResultCard.tsx` | Updated generic card |
| `src/features/builder/components/v2/EditSuggestionCard.tsx` | Verified compatibility |
| `src/features/builder/components/v2/DiagramSuggestionCard.tsx` | Verified compatibility |

---

## 🚫 Constraints

- Preserve existing card styling
- Keep user interaction patterns
- Don't break existing functionality

---

*Generated by vibe-orchestrator mode*
