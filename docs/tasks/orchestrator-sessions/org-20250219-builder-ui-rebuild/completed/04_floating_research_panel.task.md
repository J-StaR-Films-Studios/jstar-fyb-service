# Task: Floating Research Panel + Research Sources Card

**Session ID:** org-20250219-builder-ui-rebuild
**Source:** Orchestrator
**Context:** Complete Builder UI Transformation
**Priority:** P1
**Dependencies:** Task 1 (Foundation & Layout)
**Created At:** 2026-02-19T09:19:00+01:00

---

## Objective

Implement the floating research panel (slide-out from right) and the compact research sources card. This is a KEY innovation that moves 100+ research papers out of the main content flow.

## Scope

**In Scope:**
1. Create `FloatingResearchPanel.tsx` - Slide-out panel with:
   - Header: "Research Library" + count + close button
   - Tabs: All Sources / Papers / Uploaded
   - Search input with icon
   - Scrollable document list with:
     - PDF icon (red) for free papers
     - Lock icon (orange) for paywalled papers
     - Article icon (blue) for web articles
   - Footer: "Deep Research" button + "Upload Document" button
   - Overlay behind panel (click to close)
   - Escape key to close

2. Create `ResearchSourcesCard.tsx` - Compact card with:
   - Library icon + "Research Sources" title
   - Count: "47 papers · 3 uploaded"
   - Mini list (2-3 document previews)
   - "View All" button (opens panel)
   - "+ Add Source" button

3. Panel behavior:
   - Desktop: 400px wide, slides from right
   - Mobile: Full width, slides from right
   - Body scroll locked when open
   - Smooth transition animation

4. Integration:
   - Toggle from header "Research" button
   - Toggle from `ResearchSourcesCard` "View All"
   - Toggle from mobile nav "Research" tab

**Out of Scope:**
- Actual document upload functionality (exists in DocumentUpload)
- Deep research API integration (exists)
- Document viewer functionality

## Context

### Current State
- `DocumentUpload.tsx` shows full research library inline
- No floating panel exists
- `BuilderLayoutContext` will provide `isResearchPanelOpen` state

### Mockup Reference
- Floating panel: Lines 210-338 of `mockup-refined-builder.html`
- Research sources card: Lines 587-621 of `mockup-refined-builder.html`
- Design spec: Lines 99-143 of `DESIGN-SPEC-BUILDER.md`

### Key Styles from Mockup
```html
<!-- Panel -->
<aside class="fixed top-0 right-0 w-full md:w-[400px] h-full bg-[#111118] border-l border-white/10 z-50 transition-panel flex flex-col shadow-2xl">
    <!-- Header -->
    <div class="p-6 border-b border-white/5 flex justify-between items-center bg-[#111118]/95 backdrop-blur-md sticky top-0">
        <div>
            <h2 class="text-xl font-display font-bold">Research Library</h2>
            <p class="text-xs text-muted mt-1">47 relevant papers found</p>
        </div>
        <button class="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
        </button>
    </div>
    
    <!-- Tabs -->
    <div class="px-6 py-4 flex gap-2 border-b border-white/5">
        <button class="px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">All Sources</button>
        <button class="px-4 py-1.5 bg-white/5 text-muted text-xs font-semibold rounded-full">Papers</button>
        <button class="px-4 py-1.5 bg-white/5 text-muted text-xs font-semibold rounded-full">Uploaded</button>
    </div>
    
    <!-- Search -->
    <div class="px-6 py-4">
        <div class="relative group">
            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"></i>
            <input type="text" placeholder="Search sources..." class="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50">
        </div>
    </div>
    
    <!-- Document List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-3 pb-24">
        <!-- Document items... -->
    </div>
    
    <!-- Footer -->
    <div class="p-6 border-t border-white/10 bg-[#111118] absolute bottom-0 w-full">
        <button class="w-full py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-bold">Deep Research</button>
        <button class="w-full py-3 border border-white/10 rounded-xl mt-3">Upload Document</button>
    </div>
</aside>

<!-- Overlay -->
<div id="panel-overlay" class="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"></div>
```

### Panel Transition CSS
```css
#research-panel {
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
#research-panel.open {
    transform: translateX(0);
}
```

## Definition of Done

- [ ] `FloatingResearchPanel.tsx` created with all sections
- [ ] `ResearchSourcesCard.tsx` created as compact summary
- [ ] Panel slides in/out smoothly (transform animation)
- [ ] Overlay appears behind panel
- [ ] Body scroll locked when panel open
- [ ] Escape key closes panel
- [ ] Toggle from header button works
- [ ] Toggle from card "View All" works
- [ ] Desktop: 400px width
- [ ] Mobile: Full width
- [ ] Document list shows correct icons (PDF/lock/article)
- [ ] `npx tsc --noEmit` passes

## Expected Artifacts

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/FloatingResearchPanel.tsx` | CREATE | Slide-out research panel |
| `src/features/builder/components/ResearchSourcesCard.tsx` | CREATE | Compact research summary card |
| `src/features/builder/context/BuilderLayoutContext.tsx` | MODIFY | Add panel state if not already |

## Constraints

- ONLY perform the work outlined above
- Use existing document data from store/API
- Do NOT implement new document fetching logic
- Signal completion using `attempt_completion` tool
- Create `04_floating_research_panel.result.md` file with summary when complete

---
*Generated by vibe-orchestrator mode*