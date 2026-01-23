---
title: "[Feature] Direct Agency Signup Route"
labels: MUS, enhancement, frontend, agency-onboarding
---

## User Story

As an admin, I want a direct link to share with leads via WhatsApp/DM, so that they bypass Jay and go straight to the signup form.

## Proposed Solution

Create a new public route that renders the agency signup form directly.

### File Location
`src/app/(marketing)/agency/signup/page.tsx`

### Route
`/agency/signup`

### Query Parameters

| Param | Required | Description |
|-------|----------|-------------|
| tier | No | Tier ID (e.g., "AGENCY_SOFT_LIFE") |
| price | No | Tier price in Naira |
| type | No | "paper" or "software" |

### Example URLs
```
/agency/signup
/agency/signup?tier=AGENCY_SOFT_LIFE&price=320000&type=software
/agency/signup?tier=AGENCY_PAPER_DEFENSE&price=80000&type=paper
```

### Behavior

1. **With tier param**: Form pre-filled with tier info, tier selector hidden
2. **Without tier param**: Show tier selector dropdown before form

### Page Structure
```tsx
export default function AgencySignupPage() {
  return (
    <div className="min-h-screen bg-dark pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-2xl">
        <header>
          <h1>Join J Star Agency</h1>
          <p>Fill in your details and we'll get started right away.</p>
        </header>
        <AgencySignupForm tier={tierFromParams} />
      </div>
    </div>
  );
}
```

## Acceptance Criteria

- [x] Route accessible at `/agency/signup`
- [x] Page renders AgencySignupForm component
- [x] Tier info extracted from URL params
- [x] No tier param shows tier selector
- [x] Tier selector allows choosing from PRICING_CONFIG.AGENCY options
- [x] Mobile-responsive layout
- [x] Consistent with marketing page styling
- [x] Back link to homepage or pricing

## Dependencies

- Depends on: ISSUE-003 (AgencySignupForm component)

## Shareable Links for Admin

After implementation, these links will be available:

```
fyb.jstarstudios.com/agency/signup?tier=AGENCY_SOFT_LIFE&price=320000&type=software
fyb.jstarstudios.com/agency/signup?tier=AGENCY_DEFENSE_READY&price=200000&type=software
fyb.jstarstudios.com/agency/signup?tier=AGENCY_CODE_GO&price=120000&type=software
fyb.jstarstudios.com/agency/signup?tier=AGENCY_PAPER_DEFENSE&price=80000&type=paper
fyb.jstarstudios.com/agency/signup?tier=AGENCY_PAPER_EXPRESS&price=60000&type=paper
```
