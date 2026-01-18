# Global Onboarding System Implementation Plan

## Objective
Implement a scalable, context-aware onboarding tour system that guides users through the entire application (Dashboard, Builder, Chat, Hub), replacing the single ad-hoc demo tour.

## 1. Scope & Coverage

### A. Dashboard Tour (Priority: High)
- **Trigger**: First visit to `/dashboard`
- **Steps**:
  1. **Sidebar/Nav**: "Navigate between your projects and tools here."
  2. **Project Card**: "Access your active projects."
  3. **New Project (FAB)**: "Start a new project from anywhere."
  4. **Chat/Hub Toggle**: "Switch between Sales (Jay) and Creative (Nengi) modes."

### B. Builder Tour (Priority: High)
- **Trigger**: First visit to `/project/builder`
- **Steps**:
  1. **Progress Bar**: "Track your project generation phases."
  2. **Input Area**: "Describe your project topic here."
  3. **Topic Switch**: "Need a different angle? Use the Topic Switcher."
  4. **Save Status**: "Your work is saved automatically locally."

### C. Chat/Hub Tour (Priority: Medium)
- **Trigger**: First visit to `/chat` or `/hub`
- **Steps**:
  1. **Bot Identity**: "You are chatting with [Name]. They specialize in [Role]."
  2. **Context Window**: "See your project context on the right (Desktop only)."
  3. **Input**: "Type your query or use `/` for commands."

## 2. Technical Architecture

### Store Refactor (`useOnboardingStore.ts`)
- **Current**: `hasCompleted: boolean` (Global binary flag)
- **New**: `completedTours: string[]` (Array of completed tour IDs, e.g., `['dashboard_v1', 'builder_v1']`)
- **Actions**: `completeTour(tourId: string)`, `resetTour(tourId: string)`, `resetAll()`.

### Tour Registry (`tourConfig.ts`)
- Create a centralized config file exporting tour definitions.
- Structure:
  ```typescript
  export const TOURS: Record<string, TourStep[]> = {
    'dashboard': [ ... ],
    'builder': [ ... ],
    'chat': [ ... ]
  };
  ```

### Auto-Discovery Hook (`useTourRouter.ts`)
- A hook that listens to `pathname`.
- Checks `completedTours` against the mapped tour for the current route.
- If not completed, calls `startTour(TOURS[currentRoute])`.
- **Delay**: Add a small delay (e.g., 1s) to allow UI to mount before starting.

## 3. UI/UX Enhancements
- **"Dismiss Forever"**: Option to skip all future tours.
- **"Restart Page Tour"**: Add to the Help/Shortcuts menu to re-trigger the tour for the current page.
- **Mobile Optimization**: Ensure steps work on mobile (using the viewport clamping fix already implemented).

## 4. Implementation Steps
1.  **Refactor Store**: Update `useOnboardingStore` to support multiple tour IDs.
2.  **Create Registry**: Define the steps for Dashboard, Builder, and Chat in `src/features/onboarding/config/tours.ts`.
3.  **Build Router**: Create `useTourRouter` hook.
4.  **Integrate**: Mount `useTourRouter` in `SaasShell` so it checks every page load.
5.  **Testing**: Verify each tour triggers only once and saves state correctly.
