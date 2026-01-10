# Influencer Referral & Discount System

## Overview

The influencer referral system enables partners to earn 10% commission on all payments from users they refer. A separate discount code system provides promotional pricing. Admin has full control via dashboard.

## Features

### 1. Influencer Referrals

| Feature | Description |
|---------|-------------|
| **Referral Codes** | Unique codes like `JOHNGPT` for each influencer |
| **10% LTV Commission** | Lifetime value - influencer earns on ALL payments from referred users |
| **Admin-Controlled Credits** | Grant free credits for demo content creation |
| **Payout Tracking** | Track pending payouts, mark as paid |

### 2. Discount Codes

| Feature | Description |
|---------|-------------|
| **Percentage & Fixed** | `15%` off or `₦5000` off |
| **Usage Limits** | Max uses, minimum purchase amount |
| **Expiry Dates** | Auto-expire codes |
| **Real-time Validation** | Applied during payment initialization |

---

## API Endpoints

### Public

```
POST /api/referral/validate     - Validate referral code
POST /api/referral/link         - Link user to influencer
POST /api/discount/validate     - Validate discount code + amount
```

### Payment Integration

```
POST /api/pay/initialize
  Body: { projectId, callbackUrl?, discountCode? }
  Response: { url, originalAmount, finalAmount, discountApplied? }
```

### Admin

```
GET  /api/admin/influencers     - List all with stats
POST /api/admin/influencers     - Create influencer
POST /api/admin/influencers     - Actions: grant_credits, toggle_active, mark_paid

GET  /api/admin/discounts       - List all codes
POST /api/admin/discounts       - Create code, deactivate
```

---

## Database Schema

### New Models

```prisma
Influencer {
  referralCode   String @unique
  commissionRate Float  @default(0.10)
  freeCredits    Float  @default(0)     // Admin-controlled
  creditsUsed    Float  @default(0)
  totalEarnings  Float  @default(0)
  pendingPayout  Float  @default(0)
}

Commission {
  influencerId, paymentId, amount, status (PENDING/PAID)
}

DiscountCode {
  code           String @unique
  discountType   "PERCENTAGE" | "FIXED"
  discountValue  Float
  maxUses, minAmount, expiresAt
}
```

### Extended Models

- `User.referredById` → Links to `Influencer`
- `Payment.discountCodeId`, `Payment.discountAmount`

---

## Admin UI

Access via: `/admin/influencers` and `/admin/discounts`

### Influencer Management
- View all influencers with referral counts, earnings
- Grant free credits (for demo content)
- Toggle active/inactive
- Mark commissions as paid

### Discount Management
- Create % or fixed discount codes
- Set usage limits and expiry
- Deactivate codes

---

## User Flow (Integration Points)

1. **Signup/Link**: Call `POST /api/referral/link` with code before first payment
2. **Payment**: Pass `discountCode` to `POST /api/pay/initialize`
3. **Commission**: Auto-recorded in `billing.service.ts` after payment success

---

## Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `prisma/schema.prisma` | Modified | Added Influencer, Commission, DiscountCode models |
| `src/services/referral.service.ts` | New | Influencer CRUD, commission tracking |
| `src/services/discount.service.ts` | New | Discount validation, application |
| `src/services/billing.service.ts` | Modified | Added commission recording hook |
| `src/app/api/referral/validate/route.ts` | New | Validate referral codes |
| `src/app/api/referral/link/route.ts` | New | Link user to influencer |
| `src/app/api/discount/validate/route.ts` | New | Validate discount codes |
| `src/app/api/admin/influencers/route.ts` | New | Admin influencer management |
| `src/app/api/admin/discounts/route.ts` | New | Admin discount management |
| `src/app/api/pay/initialize/route.ts` | Modified | Accept discount codes |
| `src/app/admin/influencers/page.tsx` | New | Admin UI |
| `src/app/admin/discounts/page.tsx` | New | Admin UI |
| `src/app/admin/layout.tsx` | Modified | Added nav items |

---

## Next Steps

1. Run `npx prisma db push` to apply schema changes
2. Create test influencer via admin dashboard
3. Integrate referral code input in user signup flow (Phase 5)
4. Add discount code input on payment page (Phase 5)
