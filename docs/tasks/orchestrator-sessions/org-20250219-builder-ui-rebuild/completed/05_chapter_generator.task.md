# Task: Chapter Generator Section (Primary Position + 3-State Cards)

**Session ID:** org-20250219-builder-ui-rebuild
**Source:** Orchestrator
**Context:** Complete Builder UI Transformation
**Priority:** P1
**Dependencies:** Task 1 (Foundation), Task 3 (Outline Preview)
**Created At:** 2026-02-19T09:20:00+01:00

---

## Objective

Transform the Chapter Generator section to be the PRIMARY action after outline preview, with redesigned chapter cards showing 3 distinct states (Complete/Generating/Queued).

## Scope

**In Scope:**
1. Reorder content in `ChapterOutliner.tsx`:
   - Move `ChapterGenerator` from THIRD to FIRST position (after outline preview)
   - This becomes the primary action for unlocked DIY mode

2. Redesign `ChapterGenerator.tsx` section header:
   - Lightning bolt icon (purple/yellow)
   - "Generate Chapters" heading
   - Progress badge: "2/5 Ready" (green background)

3. Create `ChapterCard.tsx` with 3 states:
   - **Complete**: Green left border, checkmark icon, "Complete" pill, word count, "View" button
   - **Generating**: Purple left border, spinner icon, "Generating..." pill, progress bar, percentage
   - **Queued**: Gray border, number icon, "Queued" pill, estimated word count, disabled button

4. Card layout:
   - Icon (left) + Title + Status pill
   - Description text
   - Metadata (word count / progress / estimated)
   - Action button (right)

**Out of Scope:**
- Actual chapter generation logic (exists)
- Chapter content viewer (exists)
- Export functionality

## Context

### Current State
- `ChapterGenerator.tsx` exists but has basic styling
- Currently rendered THIRD in DIY mode (after ProjectActionCenter, DocumentUpload)
- No distinct card states for chapters

### Mockup Reference
- Chapter generator section: Lines 484-581 of `mockup-refined-builder.html`
- Design spec: Lines 174-197 of `DESIGN-SPEC-BUILDER.md`

### Key Styles from Mockup
```html
<!-- Section Header -->
<div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <i data-lucide="zap" class="w-4 h-4 text-yellow-300 fill-yellow-300"></i>
        </div>
        <h2 class="text-2xl font-display font-bold">Generate Chapters</h2>
        <span class="ml-2 px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase border border-green-500/30">2/5 Ready</span>
    </div>
</div>

<!-- Card: Complete -->
<div class="glass-panel p-5 rounded-xl border-l-[3px] border-l-green-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 shrink-0">
            <i data-lucide="check" class="w-5 h-5"></i>
        </div>
        <div>
            <div class="flex items-center gap-2 mb-1">
                <h3 class="font-display font-bold text-lg">Chapter 1: Introduction</h3>
                <span class="status-pill status-complete">Complete</span>
            </div>
            <p class="text-sm text-gray-400 line-clamp-1">Overview of fraud detection landscape...</p>
            <div class="mt-2 text-xs text-gray-500 font-mono">2,450 words · Generated 2m ago</div>
        </div>
    </div>
    <button class="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium w-full md:w-auto">View Content</button>
</div>

<!-- Card: Generating -->
<div class="glass-panel p-5 rounded-xl border-l-[3px] border-l-primary flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
    <div class="absolute bottom-0 left-0 h-[2px] bg-primary/20 w-full">
        <div class="h-full bg-primary w-[60%] shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse"></div>
    </div>
    <div class="flex items-start gap-4 z-10">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 animate-spin-slow">
            <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        </div>
        <div>
            <div class="flex items-center gap-2 mb-1">
                <h3 class="font-display font-bold text-lg">Chapter 2: Literature Review</h3>
                <span class="status-pill status-generating">Generating...</span>
            </div>
            <p class="text-sm text-gray-400">Analyzing 12 research papers for citations...</p>
            <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-primary font-bold">60%</span>
                <span class="text-xs text-gray-500">Est. 45s remaining</span>
            </div>
        </div>
    </div>
</div>

<!-- Card: Queued -->
<div class="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 opacity-60 hover:opacity-100 transition-opacity">
    <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 border border-white/10 shrink-0 font-mono text-sm">03</div>
        <div>
            <div class="flex items-center gap-2 mb-1">
                <h3 class="font-display font-bold text-lg text-gray-300">Chapter 3: Methodology</h3>
                <span class="status-pill status-queued">Queued</span>
            </div>
            <p class="text-sm text-gray-500">System architecture, algorithms, and data flow design.</p>
            <div class="mt-2 text-xs text-gray-600 font-mono">~2,800 words estimated</div>
        </div>
    </div>
    <button disabled class="px-6 py-2 rounded-lg border border-white/5 bg-white/5 text-gray-500 text-sm font-medium cursor-not-allowed w-full md:w-auto">Queue</button>
</div>
```

### Status Pill CSS
```css
.status-pill {
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.status-complete {
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.2);
}
.status-generating {
    background: rgba(139, 92, 246, 0.1);
    color: #c084fc;
    border: 1px solid rgba(139, 92, 246, 0.2);
}
.status-queued {
    background: rgba(255, 255, 255, 0.05);
    color: #9ca3af;
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Definition of Done

- [ ] `ChapterGenerator.tsx` moved to FIRST position in DIY mode
- [ ] Section header redesigned with icon + progress badge
- [ ] `ChapterCard.tsx` created with 3 states
- [ ] Complete state: green border, checkmark, word count
- [ ] Generating state: purple border, spinner, progress bar
- [ ] Queued state: gray, number icon, estimated words
- [ ] Hover effects on cards
- [ ] Responsive: stacks on mobile
- [ ] `npx tsc --noEmit` passes

## Expected Artifacts

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/ChapterCard.tsx` | CREATE | Individual chapter card with 3 states |
| `src/features/builder/components/ChapterGenerator.tsx` | MODIFY | Redesign section header, use ChapterCard |
| `src/features/builder/components/ChapterOutliner.tsx` | MODIFY | Reorder content (ChapterGenerator first) |

## Constraints

- ONLY perform the work outlined above
- Preserve existing chapter generation logic
- Do NOT change how chapters are fetched/generated
- Signal completion using `attempt_completion` tool
- Create `05_chapter_generator.result.md` file with summary when complete

---
*Generated by vibe-orchestrator mode*