# FR-007: Payment Infrastructure & Webhooks

## Overview
Automated payment verification and fulfillment system using Paystack webhooks. This infrastructure ensures that when a user pays via Paystack, the system automatically records the transaction and unlocks the relevant project features.

## Architecture
- **Webhook Endpoint:** `src/app/api/pay/webhook/route.ts`
- **Fulfillment Brain:** `src/services/billing.service.ts`
- **Admin Links:** `src/app/api/admin/leads/[id]/send-payment-link/route.ts`
- **Gateway Service:** `src/services/paystack.service.ts`
- **Pricing Config:** `src/config/pricing.ts`
- **Billing Logic:** `src/app/actions/billing.ts`
- **Data Model:** `Payment` and `Project` models in Prisma.

## Key Components

### 1. Centralized Pricing Configuration (`src/config/pricing.ts`)
Single source of truth for all pricing tiers.
- **Structure:**
    - `SAAS`: DIY Plans (`PAPER` vs `SOFTWARE`).
    - `AGENCY`: Done-For-You Plans (Mapped to tracks).
- **Tracks:**
    - **Paper Track**: Research & Writing focus (Base: ₦15k, Upsell Target: ₦80k).
    - **Software Track**: Implementation focus (Base: ₦20k, Upsell Target: ₦120k).

### 2. Smart Human Touch (Upsell Logic)
Dynamically calculates upsell offers based on user history.
- **Logic Location**: `src/app/actions/billing.ts` -> `getProjectBillingDetails`.
- **Heuristic**: 
    - Infers "Track" based on total amount paid (e.g., >₦18k = Software).
    - Calculates `Discount Price = Target Tier Price - Total Paid`.
- **UI Component**: `UpsellBridge.tsx` (Displays dynamic price or "Concierge Active" status).

### 3. Webhook Handlers
The system listens for specific Paystack events to trigger fulfillment:
- **`charge.success`**: Triggers `recordPayment` and project unlocking.
- **`transfer.success`**: (Planned) Handles automated refund logs.
- **`subscription.create`**: (Planned) Handles recurring billing for premium users.

### 2. Signature Verification
To prevent spoofing, every webhook request must be signed.
- **Algorithm**: HMAC-SHA512.
- **Implementation**: `PaystackService.verifyWebhookSignature(body, signature)`.
- **Secret**: `PAYSTACK_SECRET_KEY` (shared secret with Paystack).

### 3. Billing Service (`BillingService`)
The core busines logic for financial transactions:
- **`recordPayment(data)`**: 
    - Deduplicates events using transaction references (Idempotency).
    - Checks for the `projectId` in the Paystack `metadata`.
    - Creates a `Payment` record linked to the `User` and `Project`.
    - Triggers the unlocking process.
- **`updateProjectUnlock(projectId)`**: 
    - Sets `isUnlocked: true`.
    - Advances project status to `RESEARCH_IN_PROGRESS`.
    - **Lead Linking**: Retroactively updates `Lead` status to `PAID` via `topic` or `anonymousId` matching.

### 4. Admin Payment Links
Allows admins to send payment links to leads who haven't signed up yet.
- **Route:** `/api/admin/leads/[id]/send-payment-link`
- **Logic:**
    1. Finds or Creates a `Project` for the lead (Mode: `CONCIERGE`).
    2. Creates a `Payment` record linked to that Project.
    3. Generates Paystack link with `paymentId` in metadata.
- **Why:** Prevents "Record not found" errors during verification if the project didn't exist.

### 5. Proration & Upgrade Links (2026-01-01)
Allows admins to send prorated upgrade links to existing paid users.
- **Route:** `/api/admin/projects/[id]/send-payment-link`
- **Logic:**
    1. Fetches `totalPaid` from existing payments on the project.
    2. Calculates `prorated amount = target tier price - totalPaid`.
    3. Generates Paystack link for the difference.
- **Key Files:**
    - `SendPaymentLinkButton.tsx` - Dropdown showing prorated prices
    - `getProjectBillingDetails()` - Calculates total paid
- **UI Display:** Admin sees "Paid: ₦15,000" badge and "Due: ₦65,000" for upgrades.

### 6. Expert Services Add-ons (2026-01-01)
À la carte services for DIY users who want expert help without upgrading.
- **Config:** `PRICING_CONFIG.ADD_ONS` in `src/config/pricing.ts`
- **Services:** Defense Speech, Code Review, Chapter Editing, Rush Delivery
- **Route:** `/api/services/purchase`
- **Pages:** `/services` (listing), `/services/[serviceId]` (checkout), `/services/complete` (confirmation)

## Data Flow
```mermaid
sequenceDiagram
    participant P as Paystack
    participant W as Webhook API
    participant S as PaystackService
    participant B as BillingService
    participant DB as Database

    P->>W: POST /api/pay/webhook (Header: x-paystack-signature)
    W->>S: verifyWebhookSignature(body, sig)
    S-->>W: true
    W->>B: recordPayment(event.data)
    B->>DB: Check for existing reference
    B->>DB: Create Payment record
    B->>DB: Update Project (isUnlocked = true, isLocked = true)
    B-->>W: success
    W-->>P: 200 OK
```

## Security
1. **IP Whitelisting**: (Optional) Can be added to restricts POSTs to Paystack IPs.
2. **Signature Check**: Mandatory for every request.
3. **Idempotency**: Transaction references are unique in the `Payment` table.

## Manual Testing
A utility script is available at `scripts/test-webhook.ts` to simulate webhook events:
```bash
npx tsx scripts/test-webhook.ts
```
*Note: Ensure the local server is running and directed to the correct port (default 3000).*
