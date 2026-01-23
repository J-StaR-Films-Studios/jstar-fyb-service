---
title: "[Feature] Agency Signup Modal for Consult Page"
labels: MUS, enhancement, frontend, agency-onboarding
---

## User Story

As a user clicking an agency tier from the pricing page, I want to choose between quick signup or chatting with Jay, so that I can pick the fastest path for my situation.

## Proposed Solution

Create a modal component that appears when users land on `/project/consult` with tier query params.

### File Location
`src/features/agency/components/AgencySignupModal.tsx`

### Trigger Condition
Modal appears when URL contains `?tier=` parameter.

Example URLs:
- `/project/consult?tier=The%20Soft%20Life&price=320000&type=software`
- `/project/consult?tier=Paper%20%2B%20Defense&price=80000&type=paper`

### Modal Flow

1. **Question Screen**: "Already know your project topic?"
   - Button: "Yes, let's go fast →" → Show form
   - Button: "Not sure, let me chat with Jay first" → Close modal

2. **Form Screen**: Renders `AgencySignupForm` component

### Props
```typescript
interface AgencySignupModalProps {
  open: boolean;
  onClose: () => void;
  tier: { 
    id: string; 
    label: string; 
    price: number; 
    type: 'paper' | 'software';
  };
}
```

## Acceptance Criteria

- [x] Modal appears on mount when tier param present
- [x] Question screen shows first with two clear options
- [x] "Yes" transitions to form view within modal
- [x] "No" closes modal completely
- [x] Click outside modal closes it
- [x] ESC key closes modal
- [x] Smooth fade/slide animation
- [x] Mobile-friendly (full-screen on small devices)
- [x] Form success state shows within modal

## Dependencies

- Depends on: ISSUE-003 (AgencySignupForm component)

## Design Notes

- Use Framer Motion for animations
- Semi-transparent backdrop (`bg-black/60`)
- Modal centered with max-width on desktop
- Glass panel styling for modal content
