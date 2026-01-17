## 2024-05-22 - [Timing Attack in Webhook Verification]
**Vulnerability:** The Paystack webhook signature verification used a simple string comparison (`hash === signature`).
**Learning:** String comparison fails early when characters don't match, allowing an attacker to deduce the signature byte-by-byte by measuring response times (timing attack).
**Prevention:** Use `crypto.timingSafeEqual` which compares buffers in constant time regardless of content. Ensure buffers are of equal length before comparison to avoid errors/leaks.

## 2026-01-14 - [XSS in Mermaid Diagrams]
**Vulnerability:** `DiagramPreview.tsx` initialized Mermaid with `securityLevel: 'loose'`, which allows HTML tags (including `<script>`) in diagram labels.
**Learning:** Third-party visualization libraries often default to or allow insecure configurations that prioritize flexibility over security. When rendering user-controlled content, these defaults can lead to Stored XSS.
**Prevention:** Always explicitly set `securityLevel: 'strict'` (or equivalent) when initializing Mermaid.js or similar libraries if the input can be influenced by users.

## 2026-03-01 - [Hardcoded Secret Fallback in Partner Auth]
**Vulnerability:** `src/lib/partner-auth.ts` used a hardcoded default secret (`'dev-partner-secret-key'`) as a fallback if env vars were missing. This silently allows insecure deployments in production.
**Learning:** Hardcoded fallbacks for secrets are dangerous because they can easily be forgotten during deployment. However, simply throwing errors in `production` mode can break local builds (since `next build` sets `NODE_ENV=production`).
**Prevention:** Enforce secret presence in production but include checks for deployment environments (e.g., `VERCEL`, `RAILWAY_ENVIRONMENT`) to avoid breaking local builds.
