# DIY Writing Workflow - Master Implementation Plan

> **Purpose**: A comprehensive, phase-by-phase guide for implementing the core DIY writing experience in J-Star FYP Service. Designed to be handed off to an AI agent for autonomous, verified implementation.

---

## Executive Summary

This document outlines the implementation of the **core writing workflow** for DIY users. The goal is to automate the J-Star manual process (NotebookLM research → source synthesis → chapter generation → diagrams) into an in-app experience.

### Target User Persona
- **DIY Paper/Software Users** (₦15k-₦20k tier)
- Want to generate their project documents with AI assistance
- May or may not have research documents uploaded
- Need iterative editing capabilities, not just one-shot generation

### Core Principles
1. **Context is King**: The AI must always have full project context (topic, outline, previous chapters, uploaded docs)
2. **Incremental Progress**: Save state after every significant action
3. **Surgical Edits**: Users can edit specific paragraphs/sections, not just regenerate entire chapters
4. **Versioning**: Track changes so users can revert if needed

---

## Current System State (Read Before Implementing)

### Existing Database Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Project` | Core project entity | `topic`, `twist`, `abstract`, `status`, `contentProgress` (JSON), `aiGenerationStatus` (JSON) |
| `ChapterOutline` | Stores the 5-chapter outline | `content` (JSON/Markdown), `projectId` |
| `ResearchDocument` | Uploaded PDFs/docs | `extractedContent`, `aiInsights`, `summary` |
| `ProjectConversation` / `ProjectChatMessage` | AI chat history within a project | Stores full chat context |

### Existing API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/generate/abstract` | Generate project abstract |
| `POST /api/generate/outline` | Generate 5-chapter outline |
| `POST /api/generate/chapter` | Generate a single chapter (1-5) |
| `POST /api/projects/[id]/chat` | Project-aware AI chat |

### Existing UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `TopicSelector` | `builder/components/` | Step 1: Get topic |
| `AbstractGenerator` | `builder/components/` | Step 2: Generate abstract |
| `ChapterOutliner` | `builder/components/` | Step 3: Generate outline |
| `ChapterGenerator` | `builder/components/` | Step 4: Generate chapters |
| `ProjectAssistant` | `builder/components/` | AI Copilot chat (to be enhanced) |

---

## Implementation Phases Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Core Writing Loop                                          │
│ ─────────────────────────────────────────────────────────────────── │
│ • Chapter content storage (new DB model)                            │
│ • Chapter generation with context                                    │
│ • Section-level editing                                              │
│ • Auto-save and versioning                                           │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Research Integration                                        │
│ ─────────────────────────────────────────────────────────────────── │
│ • Gemini File Search integration                                     │
│ • Upload docs → RAG vector store                                     │
│ • Grounded chapter generation                                        │
│ • Citation support                                                   │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: AI Copilot Enhancement                                      │
│ ─────────────────────────────────────────────────────────────────── │
│ • Full project context injection                                     │
│ • "Edit this section" commands                                       │
│ • Multiple conversation threads                                      │
│ • Progress-aware suggestions                                         │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Diagrams & Export                                           │
│ ─────────────────────────────────────────────────────────────────── │
│ • Mermaid diagram generation                                         │
│ • Image embedding                                                    │
│ • DOCX/PDF export                                                    │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Deep Research Add-On (₦5,000)                               │
│ ─────────────────────────────────────────────────────────────────── │
│ • Gemini Deep Research Agent integration                             │
│ • Automated source synthesis                                         │
│ • Research report generation                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 [COMPLETE ✅]: Core Writing Loop

> **Goal**: Enable users to generate, view, edit, and save chapter content with full context awareness.

### 1.1 Database Schema Changes

#### [NEW] Create `Chapter` model in `prisma/schema.prisma`

```prisma
model Chapter {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  number    Int      // 1-5
  title     String   // e.g., "Introduction"
  
  // Content
  content   String   @db.Text // The full generated markdown
  
  // Section-level content (for granular edits)
  sections  Json?    // Array of { id, title, content, order }
  
  // Versioning
  version   Int      @default(1)
  previousVersions Json? // Array of { version, content, createdAt }
  
  // Status
  status    String   @default("DRAFT") // DRAFT, GENERATED, EDITING, FINALIZED
  wordCount Int      @default(0)
  
  // Generation metadata
  generatedAt   DateTime?
  lastEditedAt  DateTime?
  generationPrompt String? // Store the prompt used for regeneration debugging
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([projectId, number])
  @@index([projectId])
}
```

#### [MODIFY] Update `Project` model

Add relation to chapters:

```prisma
model Project {
  // ... existing fields ...
  
  // Add this relation
  chapters    Chapter[]
}
```

### 1.2 API Endpoints

#### [MODIFY] `POST /api/generate/chapter`

**Current Behavior**: Generates chapter and returns stream, stores in `contentProgress` JSON field.

**New Behavior**:
1. Generate chapter content via streaming
2. After stream complete, save to new `Chapter` model
3. Parse into sections for granular editing
4. Return chapter ID for future edits

**File**: `src/app/api/generate/chapter/route.ts`

#### [NEW] `GET /api/projects/[id]/chapters`

Returns all chapters for a project with their content and status.

**File**: `src/app/api/projects/[id]/chapters/route.ts`

#### [NEW] `PATCH /api/projects/[id]/chapters/[chapterNumber]`

Update a specific chapter or section within it.

**Request Body**:
```typescript
{
  // Option 1: Update entire chapter
  content?: string;
  
  // Option 2: Update specific section
  sectionId?: string;
  sectionContent?: string;
  
  // Option 3: AI-assisted edit
  editPrompt?: string; // "Make this section more formal"
}
```

**File**: `src/app/api/projects/[id]/chapters/[chapterNumber]/route.ts`

#### [NEW] `POST /api/projects/[id]/chapters/[chapterNumber]/versions`

Create a new version snapshot before major edits.

**File**: `src/app/api/projects/[id]/chapters/[chapterNumber]/versions/route.ts`

### 1.3 UI Components

#### [MODIFY] `ChapterGenerator.tsx`

**Current**: Generates chapters one at a time, stores in component state.

**Changes**:
1. Load existing chapters from API on mount
2. Save to database after generation completes
3. Add "Edit" button that opens section editor
4. Add version history dropdown

#### [NEW] `ChapterEditor.tsx`

A new component for editing chapter content with:
- Section-by-section view
- Inline AI edit suggestions
- Version history sidebar
- Word count tracker

**Location**: `src/features/builder/components/ChapterEditor.tsx`

#### [NEW] `SectionEditor.tsx`

Modal/panel for editing a specific section:
- Rich text input (or Markdown)
- "Improve with AI" button
- Diff view showing changes

**Location**: `src/features/builder/components/SectionEditor.tsx`

### 1.4 Writing Prompt Integration

The chapter generation should use the comprehensive prompt from your workflow docs.

**Prompt Source**: `docs/writing workflow/UNIVERSAL RESEARCH PAPER GENERATION PROMPT.md`

**Integration Point**: `src/features/builder/services/builderAiService.ts` → `generateChapterContentWithContext()`

Key sections to inject from the prompt:
1. Citation format (Author, Year)
2. Chapter structure guidelines
3. Academic tone requirements
4. Tense rules per chapter type

### 1.5 Verification Checklist

Before moving to Phase 2, verify:

- [x] `Chapter` model created and migrated
- [x] User can generate Chapter 1 and it saves to DB ✅ *(onFinish callback in /api/generate/chapter)*
- [x] User can view previously generated chapters on page refresh ✅ *(GET /chapters endpoint + ChapterEditor fetch)*
- [x] User can edit a section and changes persist ✅ *(SectionEditor w/ controlled state + PATCH endpoint)*
- [x] Version is incremented on significant edits ✅ *(Auto-versioning in PATCH endpoint)*
- [x] Word count updates automatically ✅ *(Live useMemo in SectionEditor + server-side in PATCH)*

### 1.6 Implementation Notes (2026-01-02)

#### Files Modified/Created

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `Chapter` model with versioning fields |
| `src/app/api/projects/[id]/chapters/route.ts` | GET all chapters |
| `src/app/api/projects/[id]/chapters/[chapterNumber]/route.ts` | GET/PATCH single chapter with auto-versioning |
| `src/app/api/projects/[id]/chapters/[chapterNumber]/versions/route.ts` | GET/POST version snapshots |
| `src/app/api/generate/chapter/route.ts` | Modified to save to `Chapter` model on `onFinish` |
| `src/features/builder/components/v2/ChapterEditor.tsx` | Full workspace UI with save status indicator |
| `src/features/builder/components/v2/WritingCanvas.tsx` | Controlled textarea with prop sync on chapter switch |
| `src/features/builder/components/v2/SectionEditor.tsx` | Mobile editor with controlled state + live word count |
| `src/features/builder/components/v2/SaveStatusIndicator.tsx` | Reusable save status context (placeholder for later) |

#### Key Decisions

1. **Controlled vs Uncontrolled Textareas**: Used `useState` + `useEffect` sync pattern to ensure content updates when switching chapters
2. **Auto-Versioning**: Snapshots created automatically in PATCH when content length differs by >100 chars, stored in `previousVersions` JSON (max 10 kept)
3. **Inline SaveStatusBadge**: Component defined inside ChapterEditor to avoid prop drilling, shows idle/saving/saved/error states
4. **Mobile vs Desktop**: Different layouts - mobile uses full-screen `SectionEditor` overlay, desktop uses inline `WritingCanvas`

#### Known Gaps (Deferred to Future)
- [x] Version history UI (dropdown to view/restore previous versions)
- [x] Debounced auto-save (implemented via `useDebouncedCallback`)
- [x] "Enhance with AI" button functionality (Implemented via `EnhanceOptionsPopover`)
- [x] Rich text formatting buttons (Implemented via TipTap/Novel)

### 1.7 Implementation Update (2026-01-07)
> **Status**: Phase 1 Gaps Closed ✅

We have successfully implemented the remaining Phase 1 features:
1.  **Version History**: Added `VersionHistoryDropdown` and `VersionPreviewModal` (read-only diff).
2.  **Debounced Auto-Save**: Implemented in `WritingCanvas` and `SectionEditor` to prevent API spam.
3.  **Rich Text**: Fully functional Bold, Italic, Heading, List, and Image insertions.
4.  **AI Enhance**: "Enhance" button now opens a popover to Request edits (Formalize, Expand, Shorten) which streams results back.

### 1.7 Workspace UX Refinements (2026-01-03)
> **Goal**: Seamless navigation and mobile-first experience.

#### Navigation Updates
- **Dashboard**: `ProjectCard` now has a direct "Enter Workspace" button.
- **Builder**: `ChapterOutliner` (Action Center) now guides users to "Open in Workspace" after unlock.
- **Back Navigation**: Added "Back to Dashboard" links in:
  - Desktop Sidebar (`TimelineSidebar`)
  - Mobile Header (`ChapterEditor`)

#### Mobile & AI Features
- **Mobile Chat**: Integrated "AI Chat" tab in `MobileFloatingNav` and "Enhance" button in `SectionEditor` (saves content -> opens chat).
- **Dynamic Stats**: Replaced hardcoded word count/progress with live data calculations.

#### Hotfix 2026-01-04: Progress Percentage Calculation
- **Problem**: The "Complete" percentage was stuck at 0% because the code filtered for `status === 'complete'`, but chapter statuses in the database are `'GENERATED'`, `'EDITING'`, or `'DRAFT'` — never `'complete'`.
- **Solution**: Updated `MobileTimelineView.tsx` and `TimelineSidebar.tsx` to use the formula:
  ```typescript
  Math.round((chapters.filter(c => (c.wordCount || 0) > 50).length / 5) * 100)
  ```
  This calculates: **(chapters with >50 words) / 5 total chapters × 100**

---

## PHASE 2 [COMPLETE ✅]: Research Integration

> **Goal**: Ground chapter generation in user's uploaded research documents using Gemini File Search (managed RAG).

### 2.1 Overview: Hybrid Context Implementation

We implemented a robust **Hybrid Context** strategy to maximize generation quality while ensuring accurate grounding:

1.  **Phase 2a: Structured Extraction (`openai/gpt-oss-120b`)**
    - Triggered immediately upon document upload.
    - Uses the **Paper Summary Prompt** to extract objectives, methodology, and limitations.
    - Stored in `ResearchDocument.summary`.
2.  **Phase 2b: Grounded Generation (`gemini-2.5-flash`)**
    - Uses **Gemini File Search** as a managed tool for citation retrieval.
    - Injects structured summaries into the system prompt for high-level synthesis (Synthesis Mode).
3.  **Fallback Path (`moonshotai/kimi-k2-instruct-0905`)**
    - Used for projects without research documents.

### 2.2 Implementation Notes (2026-01-03)

#### Files Created/Modified

| File | Context |
|------|---------|
| `src/lib/gemini-file-search.ts` | Added `generateWithGroundingStream` |
| `src/app/api/documents/[id]/extract/route.ts` | [NEW] Summary extraction endpoint |
| `src/app/api/generate/chapter/route.ts` | Overhauled with model-switching logic |
| `src/features/builder/services/dataExtractors.ts` | Updated to include summaries in context |

#### Key Technical Decisions

1.  **Dual-Model RAG**: Using `gpt-oss-120b` for summaries ensures we have a "birds-eye view" of the papers without hitting token limits on every generation, while `gemini-2.5-flash` handles the details.
2.  **Manual Stream Adaptation**: Since we used the raw `@google/genai` stream, we implemented a `ReadableStream` wrapper in the API route to ensure compatibility with the frontend's text streaming expected format.
3.  **Synthesis vs retrieval**: Injected summaries handle the "big picture" (Synthesis), while File Search handles the "fine details" (Retrieval).

### 2.8 Verification Checklist

- [x] `GeminiFileSearchService` updated for streaming
- [x] Project gets `fileSearchStoreId` and syncs correctly
- [x] Documents processed via `api/documents/[id]/extract` successfully
- [x] Chapter generation switches to Gemini when docs are present
- [x] Citations (Author, Year) integrated into generated text
- [x] References section appended via grounding metadata
- [x] Standard fallback uses `kimi-k2` correctly

┌─────────────────────────────────────────────────────────────────────┐
│ User uploads PDF                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: Save to ResearchDocument + Upload to FileSearchStore       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Store: fileSearchStoreName saved to Project.fileSearchStoreId       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Generation: Pass fileSearchStoreNames[] to generateContent()       │
│ → Gemini auto-retrieves relevant chunks                              │
│ → Returns groundingChunks with citations                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Database Schema Changes

#### [MODIFY] Update `Project` model

```prisma
model Project {
  // ... existing fields ...
  
  // Gemini File Search Store ID
  fileSearchStoreId   String?   // e.g., "fileSearchStores/abc123"
  fileSearchStoreCreatedAt DateTime?
}
```

#### [MODIFY] Update `ResearchDocument` model

```prisma
model ResearchDocument {
  // ... existing fields ...
  
  // File Search integration
  importedToFileSearch Boolean @default(false)
  fileSearchFileId     String? // ID returned from File Search upload
  importError          String? // Error message if import failed
}
```

### 2.4 New Service: `geminiFileSearchService.ts`

**Location**: `src/lib/gemini-file-search.ts`

```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GeminiFileSearchService = {
  
  /**
   * Create a new FileSearchStore for a project
   */
  async createStore(projectId: string): Promise<string> {
    const store = await genai.fileSearchStores.create({
      config: { displayName: `jstar-project-${projectId}` }
    });
    return store.name; // e.g., "fileSearchStores/abc123"
  },
  
  /**
   * Upload a document to an existing FileSearchStore
   */
  async uploadDocument(
    fileSearchStoreName: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      let operation = await genai.fileSearchStores.uploadToFileSearchStore({
        file: fileBuffer, // or file path
        fileSearchStoreName,
        config: { displayName: fileName, mimeType }
      });
      
      // Poll until complete
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await genai.operations.get({ operation });
      }
      
      return { success: true, fileId: operation.result?.name };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Generate content with File Search grounding
   */
  async generateWithGrounding(
    prompt: string,
    fileSearchStoreNames: string[],
    model: string = 'gemini-2.5-flash'
  ) {
    const response = await genai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{
          fileSearch: { fileSearchStoreNames }
        }]
      }
    });
    
    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      groundingSupports: response.candidates?.[0]?.groundingMetadata?.groundingSupports
    };
  },
  
  /**
   * Delete a FileSearchStore (cleanup on project deletion)
   */
  async deleteStore(fileSearchStoreName: string): Promise<void> {
    await genai.fileSearchStores.delete({ name: fileSearchStoreName });
  }
};
```

### 2.5 API Endpoint Changes

#### [MODIFY] `POST /api/documents/upload`

**Current Behavior**: Uploads file, saves to `ResearchDocument`, extracts text.

**New Behavior**:
1. Save file to `ResearchDocument` (existing)
2. Create FileSearchStore if project doesn't have one
3. Upload file to FileSearchStore
4. Update `ResearchDocument.importedToFileSearch = true`

**File**: `src/app/api/documents/upload/route.ts`

#### [MODIFY] `POST /api/generate/chapter`

**Current Behavior**: Generates chapter using static context.

**New Behavior**:
1. Check if project has `fileSearchStoreId`
2. If yes, use `GeminiFileSearchService.generateWithGrounding()`
3. Parse `groundingChunks` into citations
4. Inject citations into chapter content

**File**: `src/app/api/generate/chapter/route.ts`

#### [NEW] `POST /api/projects/[id]/research/sync`

Manually trigger re-sync of all documents to File Search (for recovery/debugging).

**File**: `src/app/api/projects/[id]/research/sync/route.ts`

### 2.6 UI Components

#### [MODIFY] `DocumentUpload.tsx`

**Current**: Shows upload progress, extracts metadata.

**Changes**:
1. Add "Synced to AI" indicator badge
2. Show error state if File Search upload fails
3. Add "Retry Sync" button for failed uploads

#### [NEW] `ResearchStatus.tsx`

A status panel showing:
- Number of documents synced to File Search
- Total tokens indexed (estimate)
- "Research Ready" badge when all docs synced

**Location**: `src/features/builder/components/ResearchStatus.tsx`

### 2.7 Citation Handling

When generating chapters with grounding, Gemini returns:

```json
{
  "groundingChunks": [
    { "web": { "uri": "...", "title": "Paper Title" } }
  ],
  "groundingSupports": [
    { "segment": { "startIndex": 0, "endIndex": 85 }, "groundingChunkIndices": [0] }
  ]
}
```

**Citation Insertion Logic**:
1. Parse `groundingSupports` to find which text segments have citations
2. Insert inline citations after each segment: `(Author, Year)` format
3. Build References section at chapter end from `groundingChunks`

### 2.8 Verification Checklist

Before moving to Phase 3, verify:

- [x] `GeminiFileSearchService` created and tested in isolation
- [x] Project gets `fileSearchStoreId` on first document upload
- [x] Documents show "Synced to AI" indicator after upload
- [x] Chapter generation with documents returns grounded content
- [x] Citations appear in generated chapter text
- [x] References section is auto-generated
- [ ] Cleanup: FileSearchStore deleted when project is deleted (Pending "Project Delete" feature)


---

## PHASE 3 [PLANNED]: AI Copilot Enhancement

> **Goal**: Transform ProjectAssistant into a fully context-aware writing companion that can edit specific sections, answer project questions, and guide users through the writing process.

### 3.1 Overview: The Vision

The AI Copilot should feel like a senior writing tutor who:
- Knows your entire project (topic, outline, chapters, research docs)
- Can make surgical edits to specific paragraphs
- Suggests next steps based on current progress
- Maintains separate conversation threads to avoid context pollution

### 3.2 Architecture: Context Injection

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Message: "Make the motivation section more compelling"        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Context Builder:                                                     │
│ ├── Project Topic + Abstract                                         │
│ ├── Current Chapter Content (if specified)                          │
│ ├── Current Section Content (if specified)                          │
│ ├── Research Document Summaries                                      │
│ ├── Previous Chapters (for coherence)                               │
│ └── Conversation History (current thread only)                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AI Response with:                                                    │
│ ├── Suggested edit (returned as structured output)                  │
│ ├── Explanation of changes                                           │
│ └── Next step recommendation                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Database Schema Changes

#### [MODIFY] `ProjectConversation` model

```prisma
model ProjectConversation {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  
  // Thread categorization
  threadType   String  @default("general") // "general", "chapter_1", "chapter_2", ..., "research", "editing"
  threadTitle  String? // User-facing title, e.g., "Chapter 1 Revisions"
  
  // Context scope (what this thread "sees")
  contextScope Json?   // { chapterNumbers: [1, 2], includeResearch: true }
  
  isArchived Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  ProjectChatMessage[]
  
  @@index([projectId, threadType])
}
```

### 3.4 New Service: `projectContextService.ts`

**Location**: `src/features/builder/services/projectContextService.ts`

```typescript
import { prisma } from '@/lib/prisma';

interface ProjectContext {
  topic: string;
  abstract: string | null;
  outline: string | null;
  chapters: { number: number; title: string; content: string; wordCount: number }[];
  researchSummaries: { fileName: string; summary: string }[];
  currentProgress: {
    completedChapters: number;
    totalChapters: number;
    nextRecommendedStep: string;
  };
}

export const ProjectContextService = {
  
  /**
   * Build full project context for AI consumption
   */
  async buildContext(projectId: string, options?: {
    chapterNumbers?: number[];
    includeResearch?: boolean;
    maxTokens?: number; // Truncate if needed
  }): Promise<ProjectContext> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        outline: true,
        chapters: options?.chapterNumbers 
          ? { where: { number: { in: options.chapterNumbers } } }
          : true,
        documents: options?.includeResearch 
          ? { select: { fileName: true, summary: true } }
          : false
      }
    });
    
    if (!project) throw new Error('Project not found');
    
    const completedChapters = project.chapters.filter(c => c.status === 'FINALIZED').length;
    
    return {
      topic: project.topic,
      abstract: project.abstract,
      outline: project.outline?.content || null,
      chapters: project.chapters.map(c => ({
        number: c.number,
        title: c.title,
        content: c.content,
        wordCount: c.wordCount
      })),
      researchSummaries: project.documents?.map(d => ({
        fileName: d.fileName,
        summary: d.summary || 'No summary available'
      })) || [],
      currentProgress: {
        completedChapters,
        totalChapters: 5,
        nextRecommendedStep: this.getNextStep(project)
      }
    };
  },
  
  /**
   * Build context specifically for section editing
   */
  async buildEditContext(
    projectId: string,
    chapterNumber: number,
    sectionId: string
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: { projectId, number: chapterNumber }
    });
    
    if (!chapter) throw new Error('Chapter not found');
    
    const sections = chapter.sections as any[] || [];
    const targetSection = sections.find(s => s.id === sectionId);
    
    return {
      chapterTitle: chapter.title,
      sectionTitle: targetSection?.title || 'Unknown Section',
      currentContent: targetSection?.content || '',
      surroundingContext: this.getSurroundingContext(sections, sectionId)
    };
  },
  
  getNextStep(project: any): string {
    if (!project.abstract) return 'Generate abstract';
    if (!project.outline) return 'Generate chapter outline';
    const chaptersGenerated = project.chapters?.length || 0;
    if (chaptersGenerated < 5) return `Generate Chapter ${chaptersGenerated + 1}`;
    return 'Review and export your project';
  },
  
  getSurroundingContext(sections: any[], sectionId: string): string {
    const idx = sections.findIndex(s => s.id === sectionId);
    const prev = sections[idx - 1]?.content?.slice(-500) || '';
    const next = sections[idx + 1]?.content?.slice(0, 500) || '';
    return `...${prev}\n\n[YOUR SECTION HERE]\n\n${next}...`;
  }
};
```

### 3.5 API Endpoint Changes

#### [MODIFY] `POST /api/projects/[id]/chat`

**Current Behavior**: Simple chat with project ID in context.

**New Behavior**:
1. Accept `threadId` to maintain separate conversations
2. Accept `contextScope` to limit what the AI "sees"
3. Detect "edit commands" and return structured edit suggestions
4. Inject full project context based on thread scope

**Request Body**:
```typescript
{
  message: string;
  threadId?: string;        // Which conversation thread
  targetChapter?: number;   // For edit commands
  targetSection?: string;   // For edit commands
  contextScope?: {
    chapterNumbers?: number[];
    includeResearch?: boolean;
  };
}
```

**Response**:
```typescript
{
  response: string;
  suggestedEdit?: {
    type: 'section' | 'chapter' | 'none';
    targetChapter?: number;
    targetSection?: string;
    newContent: string;
    explanation: string;
  };
  nextSteps?: string[];
}
```

**File**: `src/app/api/projects/[id]/chat/route.ts`

#### [NEW] `GET /api/projects/[id]/threads`

List all conversation threads for a project.

**File**: `src/app/api/projects/[id]/threads/route.ts`

#### [NEW] `POST /api/projects/[id]/threads`

Create a new conversation thread (e.g., "Chapter 2 Revisions").

**File**: `src/app/api/projects/[id]/threads/route.ts`

### 3.6 UI Components

#### [MODIFY] `ProjectAssistant.tsx`

**Current**: Single chat interface.

**Changes**:
1. Add thread selector dropdown
2. Add "New Thread" button
3. Add context indicator showing what the AI can "see"
4. Add "Apply Edit" button when AI suggests changes

#### [NEW] `ThreadSelector.tsx`

Dropdown/modal for switching between conversation threads:
- "General" (default)
- "Chapter X Revisions"
- "Research Questions"
- "+ New Thread"

**Location**: `src/features/builder/components/ThreadSelector.tsx`

#### [NEW] `EditSuggestionCard.tsx`

When AI suggests an edit, show:
- Diff view (before/after)
- "Apply" button
- "Modify" button (to continue editing)
- "Reject" button

**Location**: `src/features/builder/components/EditSuggestionCard.tsx`

### 3.7 Edit Command Detection

The AI should recognize commands like:
- "Make this section more formal"
- "Add more citations to paragraph 2"
- "Rewrite the introduction"
- "Expand on the methodology"

**Implementation**: Use Gemini's function calling to detect edit intent and extract target + instruction.

```typescript
const tools = [{
  name: 'suggestEdit',
  description: 'Suggest an edit to a specific section of the project',
  parameters: {
    type: 'object',
    properties: {
      targetChapter: { type: 'number', description: 'Chapter number (1-5)' },
      targetSection: { type: 'string', description: 'Section ID or title' },
      editType: { type: 'string', enum: ['rewrite', 'expand', 'condense', 'formalize', 'add_citations'] },
      newContent: { type: 'string', description: 'The suggested new content' },
      explanation: { type: 'string', description: 'Why this edit improves the writing' }
    },
    required: ['newContent', 'explanation']
  }
}];
```

### 3.8 Verification Checklist

Before moving to Phase 4, verify:

- [ ] `ProjectContextService` builds correct context from project data
- [ ] Chat responses are grounded in project context
- [ ] Thread selector UI works and maintains separate histories
- [ ] Edit commands trigger `suggestEdit` tool call
- [ ] Edit suggestions show diff view
- [ ] "Apply Edit" button updates chapter content
- [ ] Context indicator shows what AI can "see"

---

## PHASE 4 [PLANNED]: Diagrams & Export

> **Goal**: Enable users to generate Mermaid diagrams for their project (system architecture, data flow, etc.) and export the final document as DOCX or PDF.

### 4.1 Mermaid Diagram Generation

#### Overview

Users need diagrams for:
- **Chapter 3 (Methodology)**: System architecture, data flow diagrams, ER diagrams
- **Chapter 4 (Implementation)**: Flowcharts, sequence diagrams, component diagrams

#### [NEW] API Endpoint: `POST /api/generate/diagram`

**File**: `src/app/api/generate/diagram/route.ts`

**Request Body**:
```typescript
{
  projectId: string;
  diagramType: 'system_architecture' | 'data_flow' | 'er_diagram' | 'flowchart' | 'sequence' | 'custom';
  context?: string;     // Additional context or requirements
  chapterNumber?: number; // Which chapter this diagram is for
}
```

**Response**:
```typescript
{
  mermaidCode: string;
  title: string;
  explanation: string;
}
```

**Prompt Template** (from `docs/writing workflow/Mermaid Diagrams.md`):

```markdown
You are a diagram generation expert. Generate a Mermaid.js diagram based on the following project details.

**Instructions:**
1. **Use Universal Syntax:** Generate the most basic and universally compatible Mermaid.js syntax.
2. **Quote All Complex Text:** ALWAYS enclose any node text in double quotes if it contains special characters like parentheses, brackets, or colons.
3. **Infer Logical Flow:** If the user describes a system but does not define all connections, infer the logical sequence.
4. **Provide Clean Code Only:** Output should be a single, clean code block.

**Project Details:**
- Topic: {{PROJECT_TOPIC}}
- Abstract: {{PROJECT_ABSTRACT}}
- Diagram Type: {{DIAGRAM_TYPE}}
- Additional Context: {{CONTEXT}}

Generate a {{DIAGRAM_TYPE}} diagram that clearly visualizes the key components of this project.
```

### 4.2 Database Schema Changes

#### [NEW] Create `ProjectDiagram` model

```prisma
model ProjectDiagram {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  title       String
  diagramType String    // 'system_architecture', 'data_flow', etc.
  mermaidCode String    @db.Text
  svgOutput   String?   @db.Text  // Rendered SVG for export
  
  chapterNumber Int?    // Which chapter this belongs to
  order         Int     @default(0) // Order within chapter
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([projectId])
}
```

#### [MODIFY] Update `Project` model

```prisma
model Project {
  // ... existing fields ...
  diagrams    ProjectDiagram[]
}
```

### 4.3 UI Components

#### [NEW] `DiagramGenerator.tsx`

Panel for generating diagrams:
- Dropdown to select diagram type
- Text area for additional context
- "Generate" button
- Live preview of Mermaid rendering
- "Add to Chapter" button

**Location**: `src/features/builder/components/DiagramGenerator.tsx`

#### [NEW] `DiagramPreview.tsx`

Renders Mermaid code as SVG using `mermaid` library.

**Location**: `src/features/builder/components/DiagramPreview.tsx`

```tsx
import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';

export function DiagramPreview({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    mermaid.render('diagram', code).then(result => {
      setSvg(result.svg);
    });
  }, [code]);
  
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

### 4.4 Document Export

#### Option A: Server-Side DOCX Generation

Use `docx` library to generate Word documents:

**Dependencies**: `npm install docx`

**[NEW] API Endpoint: `POST /api/projects/[id]/export`**

**File**: `src/app/api/projects/[id]/export/route.ts`

```typescript
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { format } = await req.json(); // 'docx' or 'pdf'
  
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { chapters: true, diagrams: true }
  });
  
  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          text: project.topic,
          heading: HeadingLevel.TITLE
        }),
        // Abstract
        new Paragraph({
          text: 'Abstract',
          heading: HeadingLevel.HEADING_1
        }),
        new Paragraph({ text: project.abstract }),
        // Chapters
        ...project.chapters.flatMap(chapter => [
          new Paragraph({
            text: `Chapter ${chapter.number}: ${chapter.title}`,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({ text: chapter.content })
        ])
      ]
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${project.topic.slice(0, 50)}.docx"`
    }
  });
}
```

#### Option B: PDF Generation

Use `@react-pdf/renderer` or call external service.

For simplicity, initial version can:
1. Generate DOCX
2. User converts to PDF locally (or use cloud converter later)

### 4.5 UI Components

#### [NEW] `ExportPanel.tsx`

Export options panel:
- Format selector (DOCX, PDF)
- Include diagrams checkbox
- Include references checkbox
- Download button

**Location**: `src/features/builder/components/ExportPanel.tsx`

### 4.6 Verification Checklist

Before moving to Phase 5, verify:

- [ ] Diagram generation API returns valid Mermaid code
- [ ] Mermaid preview renders correctly
- [ ] Diagrams save to database
- [ ] DOCX export includes all chapters
- [ ] DOCX export includes diagrams as images
- [ ] Export file downloads correctly

---

## PHASE 5 [PLANNED]: Deep Research Add-On (₦5,000)

> **Goal**: Integrate Gemini Deep Research Agent as a premium paid feature that automates the manual NotebookLM research workflow.

### 5.1 What is Deep Research?

The **Gemini Deep Research Agent** is an autonomous agent that:
- Performs multi-step web research on a topic
- Uses Google Search grounding
- Synthesizes findings into a comprehensive report
- Includes citations and source links
- Can run for up to 60 minutes

**This replaces the manual workflow:**
1. ~~User manually searches NotebookLM~~
2. ~~User copies papers to summarize~~
3. ~~User synthesizes into single document~~

**New workflow:**
1. User clicks "Start Deep Research"
2. Agent runs in background (5-30 minutes)
3. User receives comprehensive research report
4. Report is automatically added to project context

### 5.2 Pricing Justification

| Item | Cost |
|------|------|
| Gemini 3 Pro tokens (~500K) | ~$1.50 - $3.00 |
| Google Search grounding (free tier first) | $0.00 |
| **Total API Cost** | **~$1.50 - $3.00** |
| **Price to User** | **₦5,000 (~$3.12)** |
| **Margin** | ~₦300 (~$0.12) |

> **Note**: Margin is thin but acceptable for premium feature. Consider raising to ₦6,000 for 40% margin.

### 5.3 Service Purchase Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User sees "AI Deep Research" add-on on Services page               │
│ Price: ₦5,000 | Status: Not Purchased                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ User clicks "Buy"
┌─────────────────────────────────────────────────────────────────────┐
│ Paystack payment flow                                                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Payment success
┌─────────────────────────────────────────────────────────────────────┐
│ PurchasedService record created                                      │
│ User sees "Start Research" button on project builder                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ User clicks "Start Research"
┌─────────────────────────────────────────────────────────────────────┐
│ Deep Research Agent runs in background                               │
│ User sees progress indicator                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Research complete (5-30 min)
┌─────────────────────────────────────────────────────────────────────┐
│ Research report saved to project                                     │
│ User notification sent                                               │
│ Report available in Research tab                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Database Schema Changes

#### [NEW] Create `DeepResearchJob` model

```prisma
model DeepResearchJob {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // Job status
  status    String   @default("PENDING") // PENDING, RUNNING, COMPLETED, FAILED
  progress  Int      @default(0)         // 0-100
  
  // Input
  researchQuery   String   @db.Text // Generated from project topic
  researchContext String?  @db.Text // Additional context
  
  // Output
  report          String?  @db.Text // Full research report (Markdown)
  sources         Json?    // Array of { url, title, snippet }
  tokensUsed      Int?     // For cost tracking
  
  // Timing
  startedAt       DateTime?
  completedAt     DateTime?
  estimatedMinutes Int?
  
  // Error handling
  errorMessage    String?
  retryCount      Int      @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([projectId])
  @@index([status])
}
```

#### [MODIFY] Update `Project` model

```prisma
model Project {
  // ... existing fields ...
  deepResearchJobs DeepResearchJob[]
}
```

### 5.5 New Service: `deepResearchService.ts`

**Location**: `src/lib/deep-research.ts`

```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const DeepResearchService = {
  
  /**
   * Start a deep research job (background execution)
   */
  async startResearch(
    projectId: string,
    topic: string,
    context?: string
  ): Promise<{ jobId: string; estimatedMinutes: number }> {
    
    // 1. Create job record
    const job = await prisma.deepResearchJob.create({
      data: {
        projectId,
        researchQuery: topic,
        researchContext: context,
        status: 'PENDING'
      }
    });
    
    // 2. Start background job (use queue or serverless function)
    this.runResearchInBackground(job.id);
    
    return { jobId: job.id, estimatedMinutes: 15 };
  },
  
  /**
   * Execute research (run in background worker)
   */
  async runResearchInBackground(jobId: string) {
    const job = await prisma.deepResearchJob.findUnique({
      where: { id: jobId },
      include: { project: true }
    });
    
    if (!job) throw new Error('Job not found');
    
    // Update status to RUNNING
    await prisma.deepResearchJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() }
    });
    
    try {
      // Generate research query based on project
      const researchPrompt = `
        Conduct comprehensive research on the following topic for an academic final year project:
        
        Topic: ${job.project.topic}
        Abstract: ${job.project.abstract || 'Not yet generated'}
        Focus Areas: ${job.researchContext || 'General research on this topic'}
        
        Your research should cover:
        1. Current state of the field
        2. Key technologies and methodologies
        3. Existing solutions and their limitations
        4. Research gaps and opportunities
        5. Relevant academic papers and their findings
        
        Provide a detailed research report with proper citations.
      `;
      
      // Call Gemini Deep Research
      const response = await genai.models.generateContent({
        model: 'gemini-2.5-pro', // or gemini-3-pro when available
        contents: researchPrompt,
        config: {
          tools: [{ googleSearch: {} }], // Enable Google Search grounding
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 32000
          }
        }
      });
      
      // Extract sources from grounding metadata
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        url: chunk.web?.uri || '',
        title: chunk.web?.title || '',
        snippet: chunk.web?.snippet || ''
      })) || [];
      
      // Update job with results
      await prisma.deepResearchJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          report: response.text,
          sources: sources,
          tokensUsed: response.usageMetadata?.totalTokenCount,
          completedAt: new Date(),
          progress: 100
        }
      });
      
      // Send notification to user
      await this.notifyUser(job.project.userId, job.project.id, 'Your deep research is complete!');
      
    } catch (error) {
      await prisma.deepResearchJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          retryCount: { increment: 1 }
        }
      });
    }
  },
  
  /**
   * Get research job status
   */
  async getJobStatus(jobId: string) {
    return prisma.deepResearchJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        progress: true,
        startedAt: true,
        estimatedMinutes: true,
        completedAt: true,
        errorMessage: true
      }
    });
  },
  
  /**
   * Get completed research report
   */
  async getReport(projectId: string) {
    return prisma.deepResearchJob.findFirst({
      where: { projectId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' }
    });
  }
};
```

### 5.6 API Endpoints

#### [NEW] `POST /api/projects/[id]/research/start`

Start a deep research job.

**File**: `src/app/api/projects/[id]/research/start/route.ts`

**Request Body**:
```typescript
{
  focusAreas?: string; // Optional additional context
}
```

**Response**:
```typescript
{
  jobId: string;
  estimatedMinutes: number;
}
```

#### [NEW] `GET /api/projects/[id]/research/status`

Get research job status.

**File**: `src/app/api/projects/[id]/research/status/route.ts`

#### [NEW] `GET /api/projects/[id]/research/report`

Get completed research report.

**File**: `src/app/api/projects/[id]/research/report/route.ts`

### 5.7 UI Components

#### [NEW] `DeepResearchPanel.tsx`

Panel showing:
- "Start Deep Research" button (if purchased and not yet run)
- Progress indicator (if running)
- Research report viewer (if complete)
- Sources list with links

**Location**: `src/features/builder/components/DeepResearchPanel.tsx`

#### [MODIFY] `ServicesPage`

Add `ADDON_DEEP_RESEARCH` card with:
- Description of what it does
- "Buy ₦5,000" button
- "Already Purchased" badge if bought

### 5.8 Background Job Execution

Options for running research in background:

1. **Vercel Serverless Functions** (with > 60s timeout on Pro plan)
2. **Serverless via QStash** (Upstash queue)
3. **Supabase Edge Functions**
4. **External worker** (Railway, Render)

**Recommended**: Use QStash for reliable background execution:

```typescript
import { Client } from '@upstash/qstash';

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

// Enqueue job
await qstash.publishJSON({
  url: `${process.env.APP_URL}/api/internal/research-worker`,
  body: { jobId },
  delay: 0
});
```

### 5.9 Verification Checklist

Before marking implementation complete:

- [ ] `ADDON_DEEP_RESEARCH` shows on services page with correct price
- [ ] Payment flow works for purchasing add-on
- [ ] "Start Research" button appears after purchase
- [ ] Research job starts and updates progress
- [ ] Research report is saved to database
- [ ] User receives notification when complete
- [ ] Report displays correctly with sources
- [ ] Error handling for failed jobs works

---

## Phase 0: UI Design & Navigation Architecture

> **Goal**: Establish a "Timeline & Studio" architecture to guide users through the writing journey.

### 0.1 Navigation Architecture (Version B: Timeline)

We are adopting a **Timeline-based** approach rather than simple tabs. This emphasizes progress and completion.

**Mobile (Timeline View):**
- **Structure**: Vertical line connecting chapters (Nodes).
- **Navigation**: Minimized entry points (Floating Pill) instead of a heavy bottom bar.
- **Writing**: Full-screen immersive editor.

**Desktop (Productive Studio):**
- **Left Panel**: Navigation & Timeline (Chapters).
- **Center**: Immersive Writing Canvas (Paper-like).
- **Right Panel**: Context (Research, AI Chat, Diagrams).

### 0.2 Visual Mockups

High-fidelity HTML mockups have been generated to guide implementation:

| View | File Path | Purpose |
|------|-----------|---------|
| **Mobile Workspace** | `docs/mockups/diy-workflow/v2_workspace_mobile.html` | Timeline layout, floating nav, progress tracking. |
| **Mobile Editor** | `docs/mockups/diy-workflow/v2_section_editor.html` | Immersive writing mode, smart action button. |
| **Mobile Research** | `docs/mockups/diy-workflow/v2_research_tab.html` | Grid view with thumbnails, unified search. |
| **Desktop Studio** | `docs/mockups/diy-workflow/v2_workspace_desktop.html` | 3-Column layout (Nav/Write/Context). |

> **Instruction to Agent**: When implementing Phase 1-5, **strictly follow these V2 mockups**. Open the HTML files in a browser to extract design tokens (glassmorphism classes, spacing, colors).

---

## Prompts Reference

### Prompt 1: Research Query Generation

**Source**: `docs/writing workflow/Notebook LM Research Sources.md`

```markdown
You are an expert research strategist. Your task is to generate a list of targeted search queries for a given project. Analyze the project details I provide below and create a list of search queries broken down into three strategic categories:

1.  **Core Problem & Domain Research (The "What"):** Queries to find foundational research, academic papers, and articles about the main subject matter.
2.  **Technical Implementation & Tools (The "How"):** Queries to find technical guides, documentation, tutorials, and code examples for the technologies and methods involved.
3.  **Context, Ethics, and User Impact (The "Why" & "For Whom"):** Queries to explore the ethical implications, user experience, target audience needs, and the project's place in the wider world.

--- MY PROJECT DETAILS ---

*   **PROJECT GOAL:** {{PROJECT_TOPIC}}
*   **KEY TECHNOLOGIES & METHODS:** {{DETECTED_TECHNOLOGIES}}
*   **TARGET AUDIENCE & CONTEXT:** {{PROJECT_CONTEXT}}
```

### Prompt 2: Paper Summary Extraction

**Source**: `docs/writing workflow/Paper Summary Prompt.md`

```markdown
As an AI research assistant, for each research paper in the provided text, extract and summarize the following:

1.  **Paper Title**
2.  **Authors**
3.  **Publication Year**
4.  **Objective(s)**
5.  **Motivation(s)**
6.  **Methodology**
7.  **Contribution(s)**
8.  **Limitation(s)**

Present this information sequentially for each paper using the *exact* structured format below.
```

### Prompt 3: Chapter Generation

**Source**: `docs/writing workflow/UNIVERSAL RESEARCH PAPER GENERATION PROMPT.md`

*(Full prompt embedded in builderAiService.ts - key excerpts below)*

**Chapter 1 - Introduction Guidelines**:
- 1.1 Background of the Study
- 1.2 Motivation
- 1.3 Aim and Objectives
- 1.4 Methodology (Overview)
- 1.5 Contribution to Knowledge

**Citation Format**: `(Author, Year)` - Do NOT include paper title in citation.

**Tense Rules**:
- Introduction: Present tense
- Literature Review: Past tense for findings
- Methodology: Past tense
- Results: Past tense
- Conclusion: Present tense for implications

### Prompt 4: Mermaid Diagram Generation

**Source**: `docs/writing workflow/Mermaid Diagrams.md`

```markdown
**Instructions:**
1.  **Use Universal Syntax:** Generate the most basic and universally compatible Mermaid.js syntax.
2.  **Quote All Complex Text:** ALWAYS enclose any node text in double quotes if it contains special characters.
3.  **Infer Logical Flow:** If the user lists nodes in a specific order but does not explicitly define all connections, infer the logical sequence.
4.  **Provide Clean Code Only:** Output should be a single, clean code block.
```

---

## Agent Instructions

When implementing each phase:

1. **Read the phase section completely** before writing any code
2. **Create a sub-task checklist** for the phase
3. **Implement one component at a time** (DB → API → UI → Integration)
4. **Verify each component** before moving on
5. **Update this document** with any changes or discoveries
6. **Ask for review** at phase completion before proceeding

---

*Document Version: 1.0*
*Last Updated: 2026-01-01*
*Author: Gemini/J-Star AI Pair*
