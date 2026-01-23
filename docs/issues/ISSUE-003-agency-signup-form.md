---
title: "[Feature] Agency Signup Form Component"
labels: MUS, enhancement, frontend, agency-onboarding
---

## User Story

As a user interested in agency services, I want to quickly fill a form with my details, so that I can get started without lengthy chat sessions.

## Proposed Solution

Create a reusable form component that captures agency lead information.

### File Location
`src/features/agency/components/AgencySignupForm.tsx`

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Full Name | text | Yes | min 2 chars |
| Email | email | Yes | valid email |
| Confirm Email | email | Yes | must match Email |
| WhatsApp | tel | Yes | 10-15 digits |
| Topic/Description | textarea | No | optional |
| Password | password | No | min 6 chars if provided |
| Tier | hidden | Yes | pre-filled from props |

### States

1. **Initial**: Form visible, ready for input
2. **Loading**: Submit button disabled, spinner shown
3. **Success**: Form hidden, WhatsApp button visible, success message
4. **Error**: Error message shown, form remains editable

### Props
```typescript
interface AgencySignupFormProps {
  tier?: { id: string; label: string; price: number };
  type?: 'paper' | 'software';
  onSuccess?: (result: { whatsappUrl: string }) => void;
  className?: string;
}
```

## Acceptance Criteria

- [x] Form renders all required fields
- [x] Real-time validation with visual feedback
- [x] Confirm email must match email (show error if mismatch)
- [x] WhatsApp field accepts only digits
- [x] Tier info displayed at top of form
- [x] Submit calls `agencySignupAction`
- [x] Success state shows prominent WhatsApp button
- [x] Mobile-responsive design
- [x] Matches existing glass-panel design system

## Dependencies

- Depends on: ISSUE-002 (Server action)

## Design Notes

- Use existing `glass-panel` and `rounded-2xl` styling
- Primary CTA button styling for submit
- Green success state with CheckCircle icon
- Subtle tier badge showing selected package
