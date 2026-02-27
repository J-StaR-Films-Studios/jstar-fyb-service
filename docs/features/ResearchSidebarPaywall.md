# Research Sidebar Paywall

## Goal
Restrict the Research Library sidebar (`FloatingResearchPanel`) to paid users only. Unpaid users attempting to access the library should be blocked and prompted to unlock their project.

## Components (Client)
- **`BuilderLayoutContext.tsx`**: The central state manager for the builder's layout. We will intercept the `toggleResearchPanel`, `openResearchPanel`, and `openResearchUpload` functions here.
- **`BuilderHeader.tsx`** & **`BuilderBottomNav.tsx`**: These components trigger the panel opening. By securing the context methods, these UI elements are automatically secured.
- **Toast Notifications**: Used to provide immediate feedback when an unpaid user clicks the restricted buttons.

## Data Flow
1. User clicks the "Research" button in either the top header or mobile bottom nav.
2. The click triggers `openResearchPanel` or `toggleResearchPanel` from `BuilderLayoutContext`.
3. Inside the context method, we fetch the current `isPaid` state via `useBuilderStore.getState().isPaid`.
4. If `isPaid` is `false`:
   - An error toast is displayed: "Research Library is a premium feature. Please unlock your project."
   - The window smoothly scrolls to the top (`window.scrollTo(0, 0)`) to bring the `PricingOverlay` into focus.
   - The function returns early, preventing the panel from opening.
5. If `isPaid` is `true`:
   - The state `isResearchPanelOpen` is set to `true`, and the panel slides out as normal.

## Database Schema
No database schema changes are required for this feature. We are strictly utilizing the existing `isPaid` state that is derived securely from the backend project data.
