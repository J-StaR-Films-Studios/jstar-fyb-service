---
title: "[Feature] Database Schema - Add Lead Tier Tracking Fields"
labels: MUS, enhancement, database, agency-onboarding
---

## User Story

As an admin, I want to see which tier each lead signed up for and their source, so that I can send the correct payment link and track conversion channels.

## Proposed Solution

Add new fields to the `Lead` model in Prisma schema:

```prisma
model Lead {
  // ... existing fields
  tier        String?  // e.g., "AGENCY_SOFT_LIFE", "AGENCY_CODE_GO"
  source      String   @default("JAY_CHAT") // "JAY_CHAT", "AGENCY_FORM", "DIRECT"
  name        String?  // User's name (for leads captured before account creation)
  email       String?  // User's email (for linking to user accounts)
}
```

## Acceptance Criteria

- [x] Prisma schema updated with new fields
- [x] Migration created and applied: `pnpm prisma migrate dev --name add_lead_tier_source`
- [x] Prisma client regenerated
- [ ] No breaking changes to existing lead capture flow
- [ ] Admin leads page displays tier badge (if present)

## Technical Notes

- `tier` maps to `PRICING_CONFIG.AGENCY.*` tier IDs
- `source` distinguishes between Jay chat captures and form submissions
- All new fields are nullable to maintain backward compatibility
