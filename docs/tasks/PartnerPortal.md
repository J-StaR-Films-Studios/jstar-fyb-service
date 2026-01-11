# 🎯 Task: Partner Portal Implementation (The "Vibe" Blueprint)

**Objective:** Build a secure, independent dashboard for Influencers to manage earnings, payouts, and referrals.
**Priority:** High
**Architecture:** Independent Auth System (JWT) separate from Main User Auth (`better-auth`).
**Est. Lines of Code:** ~1500+

---

## 🏗️ Phase 1: Database & Schema Migration

**Goal:** Equip the `Influencer` model with authentication capabilities.

### 1.1 Schema Update (`prisma/schema.prisma`)
Modify the `Influencer` model to include password storage and session tracking.

```prisma
model Influencer {
  id             String       @id @default(cuid())
  // ... existing fields ...
  email          String       @unique
  password       String       // [NEW] Hashed password (bcrypt)
  lastLogin      DateTime?    // [NEW] Track engagement
  resetToken     String?      // [NEW] For password recovery
  resetExpires   DateTime?    // [NEW] Expiry for token
  
  // Existing fields
  referralCode   String       @unique
  commissionRate Float        @default(0.10)
  totalEarnings  Float        @default(0)
  pendingPayout  Float        @default(0) 
  // ...
}
```

### 1.2 Migration Script
Run the migration to update the DB.
```bash
npx prisma migrate dev --name add_influencer_auth
```

### 1.3 Seeding Script (`scripts/seed-influencer-auth.ts`)
Create a script to generate passwords for existing influencers.
*   **Logic:** Fetch all influencers where `password` is null. Update them with a default hashed password (e.g., hash of "ChangeMe123!"). Log the credentials for admin distribution.

---

## 🔐 Phase 2: Partner Authentication API

**Goal:** Create a secure, standalone authentication flow for `/partner`.

### 2.1 Dependencies
Install required packages:
```bash
pnpm add bcryptjs jsonwebtoken cookie
pnpm add -D @types/bcryptjs @types/jsonwebtoken @types/cookie
```

### 2.2 Auth Utility (`src/lib/partner-auth.ts`)
Create a dedicated utility file.
*   `hashPassword(text): Promise<string>`
*   `verifyPassword(text, hash): Promise<boolean>`
*   `createSessionToken(influencerId): string` (JWT signed with `PARTNER_SECRET`)
*   `verifySessionToken(token): { id: string } | null`
*   `getPartnerSession(): Promise<Influencer | null>` (Server-side helper to read cookie)

### 2.3 Login Endpoint (`src/app/api/partner/auth/login/route.ts`)
*   **Method:** `POST`
*   **Input:** `{ email, password }`
*   **Logic:**
    1.  Find Influencer by email.
    2.  `verifyPassword`.
    3.  If valid, `createSessionToken`.
    4.  Set `HttpOnly` cookie: `partner_token`.
    5.  Return `{ success: true }`.

### 2.4 Logout Endpoint (`src/app/api/partner/auth/logout/route.ts`)
*   **Method:** `POST`
*   **Logic:** Delete `partner_token` cookie.

---

## 📊 Phase 3: Partner Data API

**Goal:** Expose simplified data for the dashboard.

### 3.1 Stats Endpoint (`src/app/api/partner/stats/route.ts`)
*   **Auth:** Validate `partner_token`.
*   **Return:**
    ```json
    {
      "totalEarnings": 50000,
      "pendingPayout": 12000,
      "totalReferrals": 45,
      "clicks": 120, // (Future: if we track clicks)
      "conversionRate": "5.4%"
    }
    ```

### 3.2 Referrals Endpoint (`src/app/api/partner/referrals/route.ts`)
*   **Auth:** Validate `partner_token`.
*   **Query Params:** `?page=1&limit=20`
*   **Return:** List of referred users (Name heavily redacted, e.g. "John D.", Date, Status, Commission Earned).

### 3.3 Payout Request (`src/app/api/partner/payout/request/route.ts`)
*   **Method:** `POST`
*   **Logic:** Create a `PayoutRequest` (might need new Model or just Email Admin). For now, send Email to Admin: "Influencer X requested payout of N...".

---

## 🎨 Phase 4: Frontend Implementation (The "Partner Portal")

**Goal:** A simplified, "Striped-down" dashboard layout.

### 4.1 Login Page (`src/app/partner/login/page.tsx`)
*   **Design:** Clean, centered card. Logo top.
*   **Form:** Email + Password.
*   **Action:** Call login API -> Redirect to `/partner`.

### 4.2 Portal Layout (`src/app/partner/layout.tsx`)
*   **Logic:**
    1.  Check `getPartnerSession()`.
    2.  If null, redirect to `/partner/login` (Server Component protection).
*   **UI:** Sidebar (Left) + Content (Right).
    *   **Sidebar Links:** Dashboard, Referrals, Settings, Logistics (Logout).

### 4.3 Dashboard Home (`src/app/partner/page.tsx`)
*   **Components:**
    *   `StatCard`: Reusable card for numbers.
    *   `EarningsChart`: Simple Recharts line chart (Earnings per day).
    *   `RecentReferrals`: Small table table showing last 5 signups.

### 4.4 Referrals Page (`src/app/partner/referrals/page.tsx`)
*   **UI:** Full datatable of referrals.
*   **Columns:** Date, User (Redacted), Plan, Earnings, Status.

### 4.5 Settings Page (`src/app/partner/settings/page.tsx`)
*   **Feature:** Update Password.
*   **UI:** Display Referral Code (Copy Button) & Discount Code.

---

## �️ Phase 5: Admin Integration

### 5.1 Admin Panel Update
Update `src/app/admin/influencers/page.tsx`.
*   **Action:** Add "Reset Password" button next to Influencers.
*   **Action:** Add "Copy Login Link" (for sending to them).

---

## ✅ Checklist for Review

1.  **Security:** Does `/partner` allow unauthorized access? (Test with curl).
2.  **Privacy:** Are we leaking User emails to Influencers? (Ensure reduction).
3.  **Accuracy:** Do the stats match the Admin panel?

---

*Verified VibeCode Blueprint*
