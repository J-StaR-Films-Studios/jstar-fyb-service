# FR-009: Authentication System

## Goal
Secure the application and manage user accounts using **Better-Auth** with Prisma. Provide a seamless login/signup experience for SaaS users and Agency clients.

## Status: ✅ Completed

---

## Component Breakdown

### Library (`src/lib/auth-client.ts`, `src/lib/auth.ts`)
- **Library:** `better-auth`
- **Adapter:** Prisma Adapter
- **Providers:** Email/Password, Google

### Routes
| Route | Purpose |
|-------|---------|
| `/auth/login` | Client component using `signIn.email` / `signIn.social` |
| `/auth/register` | Client component using `signUp.email` / `signIn.social` |
| `/profile` | User profile management and Sign Out |

---

## Technical Flow

### 1. Unified Access Control
Middleware (`src/proxy.ts`) injects metadata for Server Components and handles early routing checks.
- **Header Injection:** Injects `x-current-path` header to allow Server Components to know the current URL.
- **RBAC Protection:** Admin routes (`/admin`) are protected by checking the user's `role` field in the session.
- **Redirects:** Non-admin users attempting to access `/admin` are redirected to `/dashboard`.

### 2. RBAC (Role-Based Access Control)
The system uses a tiered role system stored in the database:
- **USER:** Default role for all signups.
- **ADMIN:** Full access to Sales, Projects, and Requests management.
- **Promotion:** Admins are promoted via a CLI script (`scripts/promote-admin.ts`) for enhanced security.

---

## Technical Details

### User Model Extension
Added `role` field (String, default: "USER") to the Prisma `User` model.

### Better-Auth Configuration (`src/lib/auth.ts`)
Configured `additionalFields` to include `role` in the session object, enabling efficient client and server-side checks.

### Server-Side Protection (`src/lib/auth-server.ts`)
`requireAdmin()` helper provides a standard way to protect both Page layouts and API Routes.

---

## Implementation Checklist
- [x] Configure Better-Auth with Prisma
- [x] Create `/auth/login/page.tsx` (Added Back/Home navigation buttons)
- [x] Create `/auth/register/page.tsx` (Added Back/Home navigation buttons)
- [x] Create `/profile/page.tsx`
- [x] Implement Middleware for Path Injection
- [x] Implement Session-based RBAC for `/admin`
- [x] Remove legacy Basic Auth from `proxy.ts`
- [x] Create Admin Promotion CLI script
- [x] Implement Post-Login Password Prompt for Magic Link users
- [x] Standardize on Bcrypt for reliable password hashing

## Feature: Magic Link Hybrid Onboarding

To solve the "stuck without password" issue for users signing up via Agency Forms or Magic Links, a hybrid flow is implemented:

### 1. Agency Signup ("Ghost Password" Strategy)
- **Path:** `src/features/agency/actions/agencySignup.ts`
- **Logic:**
  1. Creates a user account with a random temp password (required by Better-Auth email provider).
  2. **Immediately sets `password` to `NULL`** in the database via `prisma.account.update`.
  3. This flags the user as "passwordless" despite having an account.

### 2. Post-Login Password Prompt
- **Path:** `src/features/auth/components/PasswordPromptDialog.tsx`
- **Trigger:** Checks `checkHasPassword` server action on page load.
- **Logic:**
  - If User is logged in AND has NO password (or NULL password) -> Show Dialog.
  - If User is missing Name -> Show Name input.
- **Action:**
  - Calls `setInitialPassword` (Server Action).
  - Uses manual **Bcrypt** hashing to update `prisma.account`.

### 3. Bcrypt Standardization
- **Problem:** Better-Auth's `updateUser` API was rejecting password updates or using hidden hashing strategies.
- **Solution:**
  - Configured `src/lib/auth.ts` to explicitly use `bcryptjs` for `hash` and `verify`.
  - Updated `src/features/auth/actions/password.ts` to use `bcryptjs.hash` manually.
  - This ensures 100% compatibility between manual updates and Better-Auth's verification logic.
