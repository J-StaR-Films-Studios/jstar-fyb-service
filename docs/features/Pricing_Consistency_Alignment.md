# Pricing Consistency Alignment

## Goal

Make pricing changes safe to merge by ensuring customer-facing pricing in the landing page, workspace unlock flow, chat sales tools, and Paystack initialization all reflect the same source of truth.

## Components

### Client

- Landing page pricing section in `src/features/marketing/components/Pricing.tsx`
- Workspace unlock screen in `src/features/builder/components/WorkspaceLockScreen.tsx`
- Topic warning modal in `src/features/billing/components/TopicLockModal.tsx`
- Sales chat pricing tool in `src/features/bot/tools/definitions.ts`

### Server

- Paystack initialization route in `src/app/api/pay/initialize/route.ts`
- Workspace page loader in `src/app/(workspace)/project/[id]/workspace/page.tsx`
- Shared pricing config in `src/config/pricing.ts`

## Data Flow

1. `src/config/pricing.ts` defines agency tiers and the currently supported workspace unlock amount.
2. The landing page reads the shared SaaS paper and software prices from config instead of mixing track-specific values.
3. The workspace page passes the supported unlock amount into the lock screen.
4. The lock screen shows one effective amount, resets modal-local confirmation state on open, and forwards the final amount into the confirmation modal.
5. `/api/pay/initialize` uses the same shared unlock amount when creating the pending payment and initializing Paystack.
6. Sales tooling reads agency prices and labels from shared config so chat quotes stay aligned with the landing page.

## Database Schema

No schema changes.

Current limitation:
- `Project` does not store a SaaS pricing track, so the backend cannot safely charge different DIY unlock amounts per track yet.

## Notes

- Agency software tiers are set to `₦150,000`, `₦250,000`, and `₦400,000`; the canonical source of truth for future changes is `src/config/pricing.ts`.
- DIY workspace unlock is intentionally aligned to the currently supported backend amount until track-specific checkout is implemented.
- Marketing pricing shows the DIY software tier from `PRICING_CONFIG.SAAS.SOFTWARE.price` so the landing page reflects the current `₦20,000` SaaS software amount.
- Sales chat pricing reads agency software tier labels directly from `PRICING_CONFIG.AGENCY.SOFTWARE` so customer-facing names stay aligned with configuration.
