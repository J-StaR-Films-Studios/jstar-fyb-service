# Task: Quick Actions Grid (2x2)

**Session ID:** org-20250219-builder-ui-rebuild
**Source:** Orchestrator
**Context:** Complete Builder UI Transformation
**Priority:** P1
**Dependencies:** Task 1 (Foundation & Layout)
**Created At:** 2026-02-19T09:21:00+01:00

---

## Objective

Create the Quick Actions 2x2 grid that replaces the current `ProjectActionCenter` component. This provides quick access to Chat, Deep Research, Export, and Defense Slides.

## Scope

**In Scope:**
1. Create `QuickActions.tsx` - 2x2 grid with:
   - **Ask Monji** (purple icon) - Opens chat with AI assistant
   - **Deep Research** (blue icon) - Triggers deep research
   - **Export** (green icon) - Export project (PDF/Word)
   - **Slides** (orange icon) - Create defense slides

2. Each action button:
   - Colored icon (hover scale effect)
   - Bold label text
   - Sub-label (gray, smaller)
   - Hover: background color tint, border color

3. Layout:
   - 2 columns on desktop
   - Single column on mobile (stacked)
   - Glass morphism card container

4. Replace `ProjectActionCenter` in `ChapterOutliner.tsx`:
   - Remove `ProjectActionCenter` import and usage
   - Add `QuickActions` in secondary actions grid

**Out of Scope:**
- Actual export functionality (exists elsewhere)
- Deep research implementation (exists)
- Chat functionality (exists)
- Slides generation (may need implementation separately)

## Context

### Current State
- `ProjectActionCenter.tsx` shows "Project Unlocked" + "Coming Soon" cards
- Not matching the mockup's quick actions design
- Rendered in DIY mode content

### Mockup Reference
- Quick actions: Lines 624-658 of `mockup-refined-builder.html`
- Design spec: Lines 213-226 of `DESIGN-SPEC-BUILDER.md`

### Key Styles from Mockup
```html
<!-- Quick Actions Card -->
<div class="glass-panel p-6 rounded-2xl">
    <h3 class="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <i data-lucide="zap" class="w-4 h-4 text-accent"></i> Quick Actions
    </h3>
    <div class="grid grid-cols-2 gap-3">
        <!-- Ask Monji -->
        <button class="p-4 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/30 transition-all text-left group">
            <i data-lucide="bot" class="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform"></i>
            <div class="font-bold text-sm text-gray-200 group-hover:text-white">Ask Monji</div>
            <div class="text-[10px] text-gray-500">Chat with AI</div>
        </button>
        
        <!-- Deep Research -->
        <button class="p-4 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition-all text-left group">
            <i data-lucide="globe" class="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform"></i>
            <div class="font-bold text-sm text-gray-200 group-hover:text-white">Deep Research</div>
            <div class="text-[10px] text-gray-500">Find new sources</div>
        </button>
        
        <!-- Export -->
        <button class="p-4 rounded-xl bg-white/5 hover:bg-green-500/10 border border-white/5 hover:border-green-500/30 transition-all text-left group">
            <i data-lucide="download" class="w-5 h-5 text-green-400 mb-2 group-hover:scale-110 transition-transform"></i>
            <div class="font-bold text-sm text-gray-200 group-hover:text-white">Export</div>
            <div class="text-[10px] text-gray-500">PDF / Word</div>
        </button>
        
        <!-- Slides -->
        <button class="p-4 rounded-xl bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 transition-all text-left group">
            <i data-lucide="presentation" class="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform"></i>
            <div class="font-bold text-sm text-gray-200 group-hover:text-white">Slides</div>
            <div class="text-[10px] text-gray-500">Create Deck</div>
        </button>
    </div>
</div>
```

## Definition of Done

- [ ] `QuickActions.tsx` created with 2x2 grid
- [ ] 4 action buttons with correct icons and colors
- [ ] Hover effects: background tint, border color, icon scale
- [ ] Glass morphism card container
- [ ] Responsive: 2 columns desktop, 1 column mobile
- [ ] `ProjectActionCenter` removed from DIY mode content
- [ ] `QuickActions` added to secondary actions grid
- [ ] `npx tsc --noEmit` passes

## Expected Artifacts

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/QuickActions.tsx` | CREATE | 2x2 quick actions grid |
| `src/features/builder/components/ChapterOutliner.tsx` | MODIFY | Replace ProjectActionCenter with QuickActions |

## Constraints

- ONLY perform the work outlined above
- Wire buttons to existing functionality where possible
- Do NOT implement new export/slides logic
- Signal completion using `attempt_completion` tool
- Create `06_quick_actions.result.md` file with summary when complete

---
*Generated by vibe-orchestrator mode*