# Verification: Agency Onboarding Flow

## Overview
Implemented the complete Agency Onboarding flow allowing leads to sign up via direct link or the Consultant page, captured in the database with specific tiers.

## 1. Database Schema
Updated `Lead` model in Prisma.
- Added `tier` (nullable string)
- Added `source` (default "JAY_CHAT")
- Added `name`, `email`
- **Migration**: `20260123_add_lead_tier_source` applied.

## 2. Components Implemented

### AgencySignupForm (`src/features/agency/components/AgencySignupForm.tsx`)
- **Type**: Client Component
- **Features**: Zod validation, Real-time email matching, WhatsApp input filtering.
- **Integration**: calls `agencySignupAction`.

### AgencySignupModal (`src/features/agency/components/AgencySignupModal.tsx`)
- **Type**: Client Component (Framer Motion)
- **Flow**: "Topic Decision" -> "Signup Form"
- **Trigger**: Used in Consult page.

### Direct Signup Page (`src/app/(marketing)/agency/signup/page.tsx`)
- **Route**: `/agency/signup`
- **Behavior**:
    - `?tier=AGENCY_Code_Go`: Pre-fills form.
    - No params: Shows "Select Package" fallback (MVP).

## 3. Integration Points

### Consult Page (`/project/consult`)
- Detects `?tier=` and `?price=` params.
- Opens `AgencySignupModal` automatically.
- Falls back to existing variants if dismissed.

### Admin Dashboard (`/admin/leads`)
- **Desktop**: Added "Tier" column.
- **Mobile**: Added Tier badge to cards.
- **Badge**: Color-coded based on tier (Purple=Soft Life, Cyan=Defense Ready, etc.).

## 4. Verification Steps

### Test A: Direct Signup
1. Go to `/agency/signup?tier=AGENCY_SOFT_LIFE&price=320000&type=software`
2. Fill form.
3. Submit -> Redirects to WhatsApp with pre-filled message.
4. Check Admin -> New lead appears with "SOFT LIFE" badge.

### Test B: Consult Page Flow
1. Go to `/project/consult?tier=AGENCY_PAPER_DEFENSE&price=80000`
2. Modal should appear: "Have you chosen a topic?"
3. Click "Yes" -> Form appears.
4. Submit -> WhatsApp.

### Test C: Admin View
1. Go to `/admin/leads`
2. Verify new columns and badges.

## 5. Build Status
✅ `npx tsc --noEmit` passes with zero errors.
