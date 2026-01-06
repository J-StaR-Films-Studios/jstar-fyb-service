# FR-006: Admin Sales Automation

## Overview
A suite of tools for the Admin Lead Management interface to streamline sales and payments. It allows admins to manually generate payment links for leads, track conversions, and receive real-time notifications.

## Architecture
- **Lead API:** `src/app/api/admin/leads/[id]/send-payment-link/route.ts`
- **Project API:** `src/app/api/admin/projects/[id]/send-payment-link/route.ts`
- **Services:** 
  - `PaystackService` (`src/services/paystack.service.ts`)
  - `NotificationService` (`src/services/notification.service.ts`)
- **UI:** `src/features/admin/components/SendPaymentLinkButton.tsx`

## Key Capabilities

### Manual Payment Link Generation
Admins can select a pricing tier (Basic, Standard, Premium) for any lead. The system:
- Generates a unique Paystack transaction reference.
- Creates a secure checkout URL.
- Associates the potential payment with the Lead ID.

### Project Upgrade Links (Proration)
For existing paid projects, admins can send prorated upgrade links:
- **Route:** `/api/admin/projects/[id]/send-payment-link`
- Fetches `totalPaid` from existing payments
- Calculates `prorated amount = target tier price - totalPaid`
- Shows "PAID" badge for tiers already covered
- `SendPaymentLinkButton` shows prorated prices in dropdown

### Real-Time Notifications
Integration with external webhooks (Discord/Telegram) to notify admins of:
- New Leads Captured
- Payment Links Generated
- Successful Payments

### Enhanced Lead & Request Cards
The admin cards for leads and requests have been optimized for mobile:
- **Send Payment Link**: Direct action from the card with context-aware dropdown positioning.
- **WhatsApp Deep Linking**: Quick contact for leads.
- **Improved Proof Viewing**: Integrated `ProofModal` to view uploaded rejection evidence without leaving the app.

### UI Refinements
- **Responsive Header**: The `AdminProjectDetail` header now stacks on mobile to allow all controls (status, payment links, badges) to remain accessible without overlapping. 
- **Dropdown Bounds**: Payment tier dropdowns now detect screen edges to prevent overflowing off the page on narrow devices.

## Configuration
| Environment Variable | Description |
|----------------------|-------------|
| `PAYSTACK_SECRET_KEY` | Paystack API Secret for transaction initialization |
| `DISCORD_WEBHOOK_URL`| (Optional) URL for admin notifications |

## Hotfixes
### 2025-12-29: Fix Next.js 15 Async Params
- **Problem:** API route failed because `params` was accessed synchronously.
- **Solution:** Updated route to `await params` before extracting `id`.

### 2026-01-01: Payment Verification & Callback URL
- **Problem:** After upgrade payment, builder loaded wrong project.
- **Solution:** Added `projectId` to callback URL, updated `BuilderPage` to prioritize URL param.
