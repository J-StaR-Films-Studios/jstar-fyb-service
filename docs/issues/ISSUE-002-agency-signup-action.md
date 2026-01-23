---
title: "[Feature] Server Action - Agency Signup Handler"
labels: MUS, enhancement, backend, agency-onboarding
---

## User Story

As a user submitting the agency signup form, I want my details to be saved and an account created, so that I can proceed with payment and the admin can contact me.

## Proposed Solution

Create a new server action `agencySignupAction` that:

1. Validates form data with Zod
2. Creates/finds user account via Better Auth
3. Creates Lead record with tier info
4. Sends Discord notification to admin
5. Returns WhatsApp deep link URL

### File Location
`src/features/agency/actions/agencySignup.ts`

### Input Schema
```typescript
const AgencySignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  confirmEmail: z.string().email(),
  whatsapp: z.string().regex(/^\\d{10,15}$/),
  topic: z.string().optional(),
  tier: z.string(),
  price: z.number(),
  password: z.string().optional(),
});
```

### Return Type
```typescript
{
  success: boolean;
  whatsappUrl?: string;
  userId?: string;
  error?: string;
}
```

## Acceptance Criteria

- [ ] Server action created with proper Zod validation
- [ ] Email confirmation check (email === confirmEmail)
- [ ] User created via Better Auth if not exists
- [ ] Lead created with tier, source="AGENCY_FORM", name, email
- [ ] Discord webhook notification sent
- [ ] WhatsApp URL generated with pre-filled message
- [ ] Error handling for duplicate emails, validation failures

## Dependencies

- Depends on: ISSUE-001 (Lead schema changes)
