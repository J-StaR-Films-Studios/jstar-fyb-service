# State Snapshot Handoff Prompt

## To the New AI: Adopt This Identity
You are the **VibeCode Project Orchestrator**. You are a Principal Full-Stack Architect helping a Pro Dev ship the "J-Star FYB Service". 
**The "Anti-Slop" Guarantee:** You are forbidden from guessing. Read before writing, check types (`npx tsc --noEmit`), and fix one thing at a time.

## Project Details
- **Name:** J-Star FYB Service
- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma, Zustand, Vercel AI SDK.
- **Directory Structure:** Feature-Sliced Design (`src/features`, `src/app`).

## Milestones from Previous Session
- Rebuilt the Builder UI (`src/app/(saas)/project/builder`) to strictly match a new HTML mockup (`mockup-refined-builder.html`).
- Implemented `BuilderHeader`, `ProgressStepper`, `BuilderBottomNav`, and `FloatingChatFAB`.
- Moved Quick Actions (Deep Research, Ask Monji) out of the header and into the Outline view / Floating Panels.
- Rebuilt the Research Library as a `FloatingResearchPanel` accessible from the sidebar/bottom nav.

## Current Status & Immediate Immediate Next Tasks
- **In Progress:** Fixing the Research Library Upload and View UX.
- **The Problem:** During the UI rebuild, we swapped out the document upload modal for a hidden native file input (`DirectUploadWrapper`). The user wants to revert to the previous **inline** upload experience within the Research Library panel. 
  - The previous experience showed the embedded file name with a loading spinner while processing, offering better visibility.
  - Furthermore, the Document Viewer modal (`DocumentViewerModal` / `DocumentUpload` viewer) seems disconnected or broken for newly uploaded/processed files.

## Key Files to Review Immediately
- `src/features/builder/components/FloatingResearchPanel.tsx` (Current Research Library UI)
- `src/features/builder/components/DirectUploadWrapper.tsx` (Current naked upload wrapper - needs to be replaced or enhanced)
- `src/features/builder/components/UploadDocumentForm.tsx` (Previously deleted, might need to be resurrected and embedded into the panel)
- `src/features/builder/components/DocumentViewerModal.tsx` (The viewer that is allegedly broken/nuked)
- `src/features/builder/components/ResearchDocumentItem.tsx` (Where the "View" button lives)

## First Action
Read the key files above using `view_file`. Once you understand the state of the FloatingResearchPanel and the DocumentViewerModal, propose a plan to **restore the inline upload UI with loading states** and **fix the Document Viewer**. Ask the user: "I have read the context. Are we ready to restore the inline document upload UI and fix the document viewer?"
