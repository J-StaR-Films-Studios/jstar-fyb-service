# Task: Builder Mobile Bottom Nav + Floating Chat FAB

**Session ID:** org-20250219-builder-ui-rebuild
**Source:** Orchestrator
**Context:** Complete Builder UI Transformation
**Priority:** P1
**Dependencies:** Task 1 (Foundation & Layout)
**Created At:** 2026-02-19T09:23:00+01:00

---

## Objective

Create a builder-specific mobile bottom navigation (4 tabs) and a floating chat FAB button. This replaces the global `MobileBottomNav` on the builder route only.

## Scope

**In Scope:**
1. Create `BuilderBottomNav.tsx` - 4-tab navigation:
   - **Home** (house icon) â `/dashboard`
   - **Projects** (folder icon) â `/dashboard` (projects tab)
   - **Build** (hammer icon, center FAB) â current route (active)
   - **Research** (book icon + badge) â toggles research panel
   - **Me** (user icon) â `/profile`

2. Create `FloatingChatFAB.tsx` - Gradient chat button:
   - Fixed position: bottom-right
   - Above mobile nav on mobile (`bottom-20`)
   - Near bottom-right on desktop (`bottom-6`)
   - Gradient: primary to accent
   - Glow effect
   - Links to `/hub` or `/chat`

3. Layout:
   - Center FAB elevated above nav bar
   - Safe area padding for iPhone notch
   - Glass morphism background

4. Integration:
   - Render in `BuilderClient.tsx` (not in SaasShell)
   - Only visible on builder route
   - Global `MobileBottomNav` hidden on builder route (Task 1)

**Out of Scope:**
- Header changes
- Research panel implementation
- Content changes

## Context

### Current State
- Global `MobileBottomNav.tsx` has 5 tabs with center FAB
- Shown on all saas routes
- Builder needs different nav (4 tabs + research toggle)

### Mockup Reference
- Mobile bottom nav: Lines 727-766 of `mockup-refined-builder.html`
- Design spec: Lines 327-338 of `DESIGN-SPEC-BUILDER.md`

### Key Styles from Mockup
```html
<!-- Mobile Bottom Nav -->
<nav class="fixed bottom-0 w-full bg-dark/90 backdrop-blur-xl border-t border-white/10 z-50 md:hidden pb-safe">
    <div class="flex justify-between items-end px-4 h-20 pb-4 relative">
        <!-- Home -->
        <button class="flex flex-col items-center justify-end text-gray-400 hover:text-white transition-colors w-16 h-12">
            <i data-lucide="home" class="w-6 h-6 mb-1"></i>
            <span class="text-[10px] font-medium">Home</span>
        </button>
        
        <!-- Projects -->
        <button class="flex flex-col items-center justify-end text-gray-400 hover:text-white transition-colors w-16 h-12">
            <i data-lucide="folder" class="w-6 h-6 mb-1"></i>
            <span class="text-[10px] font-medium">Projects</span>
        </button>
        
        <!-- FAB (Build) - Center, Elevated -->
        <div class="absolute left-1/2 -translate-x-1/2 -top-6">
            <button class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg border-4 border-dark hover:scale-105 transition-transform">
                <i data-lucide="hammer" class="w-7 h-7 text-white fill-white/20"></i>
            </button>
            <span class="text-[10px] font-bold text-white absolute -bottom-4 left-1/2 -translate-x-1/2 tracking-wider">BUILD</span>
        </div>
        
        <!-- Spacer for FAB -->
        <div class="w-16"></div>
        
        <!-- Research -->
        <button class="flex flex-col items-center justify-end text-gray-400 hover:text-white transition-colors w-16 h-12">
            <i data-lucide="book-open" class="w-6 h-6 mb-1"></i>
            <span class="text-[10px] font-medium">Research</span>
        </button>
        
        <!-- Me -->
        <button class="flex flex-col items-center justify-end text-gray-400 hover:text-white transition-colors w-16 h-12">
            <i data-lucide="user" class="w-6 h-6 mb-1"></i>
            <span class="text-[10px] font-medium">Me</span>
        </button>
    </div>
</nav>

<style>
.pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
}
</style>
```

### Chat FAB Styles
```html
<button class="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all z-30">
    <i data-lucide="message-circle" class="w-5 h-5 text-white"></i>
</button>
```

## Definition of Done

- [ ] `BuilderBottomNav.tsx` created with 4 tabs + center FAB
- [ ] Home, Projects, Research, Me tabs with correct icons
- [ ] Center FAB elevated above nav bar
- [ ] Active state on Build tab
- [ ] Research tab toggles floating panel
- [ ] Safe area padding for iPhone notch
- [ ] `FloatingChatFAB.tsx` created
- [ ] FAB has gradient + glow effect
- [ ] FAB positioned correctly (mobile vs desktop)
- [ ] Both rendered in `BuilderClient.tsx`
- [ ] Hidden on desktop (nav), visible on desktop (FAB)
- [ ] `npx tsc --noEmit` passes

## Expected Artifacts

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/BuilderBottomNav.tsx` | CREATE | Builder-specific mobile bottom nav |
| `src/features/builder/components/FloatingChatFAB.tsx` | CREATE | Floating gradient chat button |
| `src/app/(saas)/project/builder/BuilderClient.tsx` | MODIFY | Mount both new components |

## Constraints

- ONLY perform the work outlined above
- Do NOT modify global `MobileBottomNav.tsx`
- Do NOT change navigation logic on other routes
- Signal completion using `attempt_completion` tool
- Create `08_mobile_nav.result.md` file with summary when complete

---
*Generated by vibe-orchestrator mode*