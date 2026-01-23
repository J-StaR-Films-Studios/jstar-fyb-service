# Feature: Streamlined Agency Onboarding Flow

## Overview

Create a streamlined onboarding path for users interested in agency services (done-for-you packages). Currently, users clicking agency tiers land on `/project/consult`, talk to Jay, but have no clear payment path. This feature creates a unified signup form that captures leads, creates accounts, and generates WhatsApp messages for admin follow-up.

## Problem Statement

| Path | Current Flow | Problem |
|------|--------------|---------|
| **DIY** ✅ | Pricing → Builder → Setup topic → Pay ₦15k | Works well |
| **Agency** ❌ | Pricing → `/project/consult` → Talk to Jay → ??? | **No payment path** |
| **Manual Referral** ❌ | You share link → User lands on `/chat` → Jay chat | No structured data capture |

## Goals

1. **Reduce friction** for users who know their topic and want to pay immediately
2. **Capture structured lead data** (name, email, WhatsApp, topic, tier)
3. **Create user accounts** during signup for payment linking
4. **Provide direct referral link** (`/agency/signup`) for manual sales
5. **Make Jay context-aware** of the tier user clicked

---

## Functional Requirements

| Requirement ID | Description | User Story | Expected Behavior / Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-001 | **Agency Signup Form** | As a user, I want to quickly fill a form with my details, so that I can get started with agency services without lengthy chat sessions. | Form captures name, email, WhatsApp, topic, tier. Creates user account + lead record. | MUS |
| FR-002 | **Consult Page Modal** | As a user clicking an agency tier, I want to choose between quick signup or chatting with Jay, so that I can pick the fastest path for my situation. | Modal appears on `/project/consult?tier=X` asking "Already have a topic?" with Yes/No options. | MUS |
| FR-003 | **Direct Signup Route** | As an admin (you), I want a direct link to share with leads, so that they bypass Jay and go straight to the signup form. | `/agency/signup?tier=X` renders the signup form directly. | MUS |
| FR-004 | **WhatsApp Deep Link Generation** | As a user, after submitting the form, I want a pre-filled WhatsApp message button, so that I can instantly message the team with my details. | WhatsApp link opens with message containing name, email, WhatsApp, topic, tier, and price. | MUS |
| FR-005 | **Lead Tier Tracking** | As an admin, I want to see which tier each lead signed up for, so that I can send the correct payment link. | Lead model stores `tier` and `source` fields. Admin dashboard shows tier badge. | MUS |
| FR-006 | **Account Creation on Form Submit** | As the system, I need to create a user account when the form is submitted, so that payments can be linked to the user. | Better Auth creates user with email. Password optional (can set later via magic link). | MUS |
| FR-007 | **Email Confirmation Field** | As a user, I want to confirm my email by typing it twice, so that I avoid typos that would break communication. | Form has "Confirm Email" field that must match Email field. | MUS |
| FR-008 | **Jay Tier Context** | As a user who clicked an agency tier, I want Jay to know my intent, so that he doesn't ask irrelevant discovery questions. | Jay's system prompt receives tier info via URL params. Skips department questions if tier known. | Future |
| FR-009 | **Jay Topic Context** | As a user who already has a topic, I want Jay to skip topic discovery, so that the conversation is more efficient. | Jay's system prompt receives existing topic. Moves directly to contact capture. | Future |

---

## Technical Breakdown

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/app/(marketing)/agency/signup/page.tsx` | Page | Direct signup route |
| `src/features/agency/components/AgencySignupForm.tsx` | Component | Unified form component |
| `src/features/agency/components/AgencySignupModal.tsx` | Component | Modal wrapper for form |
| `src/features/agency/actions/agencySignup.ts` | Action | Server action for form submission |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `tier`, `source`, `name`, `email` to Lead model |
| `src/app/(marketing)/project/consult/page.tsx` | Add modal trigger when tier param present |
| `src/features/bot/prompts/system.ts` | Add context builder function (Future) |
| `src/app/api/chat/route.ts` | Pass tier context to prompt (Future) |

---

## Database Schema Changes

```prisma
model Lead {
  // Existing fields...
  tier        String?  // e.g., "AGENCY_SOFT_LIFE"
  source      String   @default("JAY_CHAT") // "JAY_CHAT", "AGENCY_FORM", "DIRECT"
  name        String?  // User's name
  email       String?  // User's email
}
```

---

## Acceptance Criteria

### FR-001: Agency Signup Form
- [ ] Form renders with fields: Name, Email, Confirm Email, WhatsApp, Topic (optional)
- [ ] Tier and price pre-filled from URL params
- [ ] Form validates all required fields with Zod
- [ ] Submit creates Lead record with correct tier
- [ ] Submit creates User account via Better Auth
- [ ] Loading state shown during submission
- [ ] Success state shows WhatsApp button

### FR-002: Consult Page Modal
- [ ] Modal appears when URL contains `?tier=` param
- [ ] "Yes, let's go fast" shows signup form
- [ ] "Not sure, chat with Jay first" closes modal
- [ ] Modal can be dismissed by clicking outside

### FR-003: Direct Signup Route
- [ ] `/agency/signup` renders AgencySignupForm
- [ ] Tier param pre-fills form
- [ ] Works without tier param (shows tier selector)

### FR-004: WhatsApp Deep Link
- [ ] WhatsApp URL correctly formatted with `wa.me`
- [ ] Message includes all user details
- [ ] Works on mobile (opens WhatsApp app)
- [ ] Works on desktop (opens WhatsApp Web)

### FR-005: Lead Tier Tracking
- [ ] Lead model has `tier` and `source` fields
- [ ] Admin leads page shows tier badge
- [ ] Source distinguishes form vs chat leads

---

## Implementation Order

1. **Phase 1: Infrastructure** (FR-005, FR-006)
   - Migrate schema
   - Create server action

2. **Phase 2: Form Component** (FR-001, FR-007)
   - Build AgencySignupForm
   - Add validation

3. **Phase 3: Routes** (FR-002, FR-003)
   - Create direct signup page
   - Add modal to consult page

4. **Phase 4: WhatsApp Integration** (FR-004)
   - Generate deep links
   - Test on mobile/desktop

5. **Phase 5: Jay Context** (FR-008, FR-009) - Future
   - Modify prompt builder
   - Pass context from client

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Better Auth signup may fail | Catch errors, fall back to lead-only creation |
| Duplicate emails in Lead table | Email is optional on Lead, unique on User |
| WhatsApp link not working on some phones | Test with multiple devices, provide copy button fallback |

---

## Related Documents

- [Implementation Plan](file:///C:/Users/johno/.gemini/antigravity/brain/bc371f49-6a31-4a18-af84-22925e29b207/implementation_plan.md)
- [Pricing Config](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/config/pricing.ts)
- [Lead Capture Feature](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/docs/features/FR-003_Lead_Capture.md)
