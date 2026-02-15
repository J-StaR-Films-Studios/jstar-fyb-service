# J-Star Project Builder - UI/UX Design Specification

## Overview

This document specifies the redesigned Project Builder page for J-Star, a final year project assistant platform. The goal is to create a **simple yet powerful** interface that handles complex workflows (AI chapter generation, 100+ research papers, payment flows) without overwhelming users.

---

## Core Problem Solved

**Before:** The page had 5+ vertical sections stacked, with a Research Library showing 100+ papers appearing BEFORE the main action (chapter generation). This caused:
- Visual clutter and overwhelming scroll
- Loss of focus on primary actions
- Users missing important features

**Solution:** 
- Reorder sections to prioritize chapter generation
- Move research papers to a **floating side panel**
- Use **progressive disclosure** (collapsible sections)
- Compact chapter cards with clear status indicators

---

## Page States

The page has multiple states based on user progress:

### State 1: Pre-Payment (Default View)
```
┌─────────────────────────────────────────────┐
│  HEADER                                      │
│  - Logo, Project name                        │
│  - Progress steps (Concept ✓ → Strategy ✓ → Blueprint ●) │
│  - "Research" button with count badge        │
│  - Save status indicator                     │
├─────────────────────────────────────────────┤
│  SUCCESS BANNER                              │
│  - Checkmark icon                            │
│  - "Structure Generated" heading             │
│  - Subtitle explaining next steps            │
├─────────────────────────────────────────────┤
│  OUTLINE PREVIEW CARD                        │
│  - Project title                             │
│  - Abstract preview (truncated)              │
│  - Chapter pills (Ch 1: Intro, Ch 2: Lit...) │
│  - Download button                           │
├─────────────────────────────────────────────┤
│  PAYWALL CARD                                │
│  - Lock icon + "Unlock Required" badge       │
│  - "Generate Full Content" heading           │
│  - Price (crossed out + sale price)          │
│  - "Unlock Now" CTA button                   │
└─────────────────────────────────────────────┘
```

### State 2: Post-Payment (Unlocked - DIY Mode)
```
┌─────────────────────────────────────────────┐
│  HEADER (same as above)                      │
├─────────────────────────────────────────────┤
│  SUCCESS BANNER (green checkmark)            │
├─────────────────────────────────────────────┤
│  OUTLINE PREVIEW (same, collapsible)         │
├─────────────────────────────────────────────┤
│  💜 CHAPTER GENERATOR (PRIMARY SECTION)      │
│  Header: "Generate Chapters" + progress badge│
│                                              │
│  Chapter Cards (compact, vertical list):     │
│  ┌─────────────────────────────────────────┐│
│  │ [✓] Chapter 1: Introduction    [View]   ││
│  │     ~2,500 words • Complete              ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ [⏳] Chapter 3: Methodology             ││
│  │     Generating... ████████░░ 60%        ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ [3] Chapter 3: Methodology   [Queued]   ││
│  │     ~2,800 words (disabled state)       ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  SECONDARY ACTIONS (2-column grid)           │
│  ┌──────────────────┬──────────────────┐    │
│  │ 📚 Research       │ ⚡ Quick Actions  │    │
│  │ Sources (collap.) │ [Chat] [Export]  │    │
│  │ "47 papers • 3    │ [Research] [Slides]│   │
│  │  uploaded"        │                   │    │
│  │ [View All] [+Add] │                   │    │
│  └──────────────────┴──────────────────┘    │
├─────────────────────────────────────────────┤
│  💎 CONCIERGE UPSELL (compact, bottom)       │
│  "Need help faster? Let our team handle it"  │
│  [Contact Team] button                       │
└─────────────────────────────────────────────┘
```

---

## The Floating Research Panel (Key Innovation)

The research papers (which can number 100+) live in a **slide-out panel** instead of the main page.

### Trigger Points:
1. **Header button**: "Research" with count badge (e.g., "47")
2. **Secondary action card**: "View All (47)" button
3. **Mobile bottom nav**: "Research" tab

### Panel Structure:
```
┌────────────────────────────────────────┐
│  RESEARCH LIBRARY                    [X]│
│  47 sources • 3 uploaded                │
├────────────────────────────────────────┤
│  TABS: [All] [Papers] [Uploaded]        │
├────────────────────────────────────────┤
│  SEARCH INPUT                           │
│  [🔍 Search sources...]                 │
├────────────────────────────────────────┤
│  DOCUMENT LIST (scrollable)             │
│  ┌────────────────────────────────────┐ │
│  │ 📄 Fraud Detection using Neural... │ │
│  │    Academic Paper • 2023           │ │
│  │    [Free PDF] 234 citations        │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ 📄 Blockchain Audit Systems...     │ │
│  │    Academic Paper • 2022           │ │
│  │    [Paywalled] 156 citations       │ │
│  └────────────────────────────────────┘ │
│  ... (scrolls)                          │
├────────────────────────────────────────┤
│  BOTTOM ACTIONS                         │
│  [🔍 Deep Research] (primary button)    │
│  [⬆️ Upload Document] (secondary)       │
└────────────────────────────────────────┘
```

### Panel Behavior:
- **Desktop**: Slides in from right, 380px wide
- **Mobile**: Slides in from right, full width
- **Overlay**: Semi-transparent dark background behind panel
- **Close**: Click X, click overlay, or press Escape

---

## Component Specifications

### 1. Header

**Desktop (sticky):**
- Left: Logo (J in gradient square) + "Project Builder" + project name
- Center: Progress steps as connected pills (Concept ✓ → Strategy ✓ → Blueprint ●)
- Right: Research button (with badge) + Save status indicator

**Mobile (fixed):**
- Left: Logo + step indicator dots
- Right: Research button (with badge) + Menu button
- Below: Progress bar (full width, 4px height)

### 2. Outline Preview Card

**Glass morphism style:**
- Background: rgba(255,255,255,0.03)
- Backdrop blur: 20px
- Border: 1px solid rgba(255,255,255,0.08)
- Border radius: 16px

**Content:**
- Label: "PROJECT TITLE" (cyan, uppercase, small)
- Title: Large, bold (e.g., "AI-Powered Fraud Detection System")
- Abstract: Truncated to 2-3 lines with "Read more" link
- Chapter pills: Horizontal scrollable flex of small badges

### 3. Chapter Generator Section

**Section Header:**
- Lightning bolt icon (purple)
- "Generate Chapters" heading
- Progress badge: "2/5 complete" (green background)

**Chapter Card States:**

| State | Icon | Border Color | Background | Action Button |
|-------|------|--------------|------------|---------------|
| Complete | ✓ (green) | green/20 | green/5 | "View" |
| Generating | Spinner (purple) | purple/30 | purple/5 | Progress bar |
| Queued | Number (gray) | white/10 | white/2 | "Queued" (disabled) |

**Card Layout:**
```
┌─────────────────────────────────────────────────┐
│ [ICON]  Chapter Title              [ACTIONS]    │
│         Description text                         │
│         Word count | Status                     │
└─────────────────────────────────────────────────┘
```

### 4. Research Sources Card (Collapsible)

**Collapsed State:**
```
┌─────────────────────────────────────────────────┐
│ [📚] Research Sources              47 papers   ▼│
│      47 papers • 3 uploaded                     │
└─────────────────────────────────────────────────┘
```

**Expanded State:**
- Shows 3 document previews (compact)
- "View All (47)" button → opens floating panel
- "+ Add Source" button → opens upload modal

### 5. Quick Actions Card

**2x2 Grid of small action buttons:**
1. Chat with Monji (purple icon)
2. Deep Research (blue icon)
3. Export (green icon)
4. Defense Slides (orange icon)

Each button:
- Icon (colored)
- Label text
- Sub-label (gray, smaller)

### 6. Upsell Card (Bottom)

**Compact horizontal layout:**
- Team icon (cyan)
- "Need help faster?" heading
- "Let our team handle everything in 5 days" subtitle
- "Contact Team" button (outline style)

---

## Color System

```css
/* Primary colors */
--primary: #8b5cf6;     /* Purple - main accent */
--accent: #06b6d4;      /* Cyan - secondary accent */

/* Background */
--dark: #0a0a0f;        /* Main background */
--surface: #16161f;     /* Card backgrounds */

/* Status colors */
--green: #22c55e;       /* Success/Complete */
--yellow: #eab308;      /* Warning/Pending */
--red: #ef4444;         /* Error */
--blue: #3b82f6;        /* Info/Research */
--orange: #f97316;      /* Actions */

/* Text */
--white: #ffffff;
--gray-400: #9ca3af;    /* Secondary text */
--gray-500: #6b7280;    /* Muted text */
--gray-600: #4b5563;    /* Disabled text */
```

---

## Gradient Usage

**Primary gradient:**
```css
background: linear-gradient(135deg, #8b5cf6, #06b6d4);
```
Used for: Logo, primary buttons, progress bars, text highlights

**Glass effect:**
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.08);
```

**Glow effect:**
```css
box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
```

---

## Typography

**Font families:**
- Display/Headlines: Space Grotesk
- Body/UI: Inter

**Size scale:**
```css
/* Headings */
h1: 2xl-3xl (24px-30px), font-display, bold
h2: lg-xl (18px-20px), font-bold
h3: base-lg (16px-18px), font-semibold

/* Body */
text-base: 16px
text-sm: 14px
text-xs: 12px
text-[10px]: 10px (tiny labels)

/* Uppercase labels */
text-[10px], uppercase, tracking-wider, text-gray-500
```

---

## Mobile Adaptations

### Breakpoint: 768px (md)

**Header:**
- Progress pills → Step indicator dots (3 circles)
- Research button → Only icon with badge

**Layout:**
- Single column (no grid)
- Secondary actions stack vertically
- Chapter cards stay full width

**Floating Panel:**
- Full screen width (100vw)
- Slides from right edge

### Bottom Navigation (Mobile Only)

Fixed at bottom with 4 tabs:
1. Home (house icon)
2. Build (document icon) - active state
3. Research (book icon with badge)
4. Profile (user icon)

Safe area padding for iPhone notch:
```css
padding-bottom: env(safe-area-inset-bottom);
```

---

## Animation Guidelines

**Transitions:**
```css
transition: all 0.2s ease;      /* Hover states */
transition: all 0.3s ease;      /* Panel slides */
transition: all 0.4s ease;      /* Section collapse */
```

**Key animations:**
1. Fade in on page load (staggered, 0.1s delay between elements)
2. Panel slide from right (transform: translateX)
3. Collapsible sections (max-height transition)
4. Chapter progress bar fill animation
5. Spinner rotation for "Generating" state

**Micro-interactions:**
- Button hover: scale(1.02), subtle glow increase
- Card hover: border color intensify, background brighten
- Icon hover: color shift to primary

---

## Interaction States

### Buttons

**Primary (gradient):**
- Default: Full gradient, glow shadow
- Hover: scale(1.02), opacity 0.9
- Active: scale(0.98)
- Disabled: grayscale, opacity 0.5, cursor not-allowed

**Secondary (outline):**
- Default: Transparent bg, white/10 border, gray text
- Hover: White/5 bg, white/20 border, white text
- Active: scale(0.98)

### Cards

- Default: glass effect (see above)
- Hover: background brighten to 0.06, border to 0.12
- Active/Selected: Primary border tint

### Form Inputs

- Default: Dark bg (black/30), white/10 border
- Focus: Primary/50 border, subtle glow
- Placeholder: gray-600

---

## Accessibility Notes

1. **Color contrast**: All text meets WCAG AA on dark backgrounds
2. **Focus states**: Visible focus rings on all interactive elements
3. **Screen readers**: Proper ARIA labels on icon-only buttons
4. **Keyboard nav**: Tab order follows visual hierarchy
5. **Motion**: Respect `prefers-reduced-motion` media query

---

## File Reference

A working HTML mockup exists at:
```
mockup-refined-builder.html
```

This file demonstrates all interactions and can be used as a visual reference.

---

## Summary of Key Decisions

| Decision | Rationale |
|----------|-----------|
| Research in floating panel | Prevents 100+ papers from cluttering main flow |
| Chapters at top | Primary action should be most prominent |
| Collapsible research section | Progressive disclosure - show on demand |
| Compact chapter cards | Easier to scan status of all 5 chapters |
| 2-column secondary actions | Reduces vertical scroll, groups related items |
| Badge counts everywhere | Users always know resource counts |
| Mobile-first design | High mobile usage in target demographic |

---

## Your Creative Freedom

While implementing this design, you have freedom to:
1. Adjust exact spacing/padding values
2. Choose animation easing curves
3. Add subtle micro-interactions not specified
4. Refine color values for better harmony
5. Implement loading/skeleton states
6. Add empty states for each section
7. Create hover tooltips for icon buttons

**Constraints:**
- Must keep the floating panel pattern for research
- Must keep chapters above research in visual hierarchy
- Must work on mobile (375px) through desktop (1440px+)
- Must use the glass morphism aesthetic
- Must maintain the purple/cyan gradient theme

Good luck! 🚀