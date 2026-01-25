## 2024-05-22 - [Timing Attack in Webhook Verification]
**Vulnerability:** The Paystack webhook signature verification used a simple string comparison (`hash === signature`).
**Learning:** String comparison fails early when characters don't match, allowing an attacker to deduce the signature byte-by-byte by measuring response times (timing attack).
**Prevention:** Use `crypto.timingSafeEqual` which compares buffers in constant time regardless of content. Ensure buffers are of equal length before comparison to avoid errors/leaks.

## 2026-01-14 - [XSS in Mermaid Diagrams]
**Vulnerability:** `DiagramPreview.tsx` initialized Mermaid with `securityLevel: 'loose'`, which allows HTML tags (including `<script>`) in diagram labels.
**Learning:** Third-party visualization libraries often default to or allow insecure configurations that prioritize flexibility over security. When rendering user-controlled content, these defaults can lead to Stored XSS.
**Prevention:** Always explicitly set `securityLevel: 'strict'` (or equivalent) when initializing Mermaid.js or similar libraries if the input can be influenced by users.

## 2026-01-21 - [Defense in Depth for Mermaid XSS]
**Vulnerability:** Relying solely on `mermaid.securityLevel: 'strict'` is fragile; if a developer reverts it to 'loose' for styling, XSS is reintroduced.
**Learning:** Configuration-based security controls are easily bypassed by future code changes.
**Prevention:** We added `DOMPurify` sanitization as a redundant layer. If Mermaid configuration fails or is weakened, the sanitizer still prevents script execution.

## 2026-02-14 - [Missing Security Headers in Next.js]
**Vulnerability:** The application lacked standard HTTP security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) in `next.config.ts`.
**Learning:** Next.js does not enforce strict security headers by default, leaving the application vulnerable to clickjacking, MIME sniffing, and downgrade attacks unless explicitly configured.
**Prevention:** Always configure the `headers()` async function in `next.config.ts` to include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.

## 2026-02-18 - [Incomplete SSRF Protection in API Route]
**Vulnerability:** The document upload API (`src/app/api/documents/upload/route.ts`) implemented its own ad-hoc blacklist for SSRF protection, checking only for `localhost`, `127.`, `192.168.`, and `10.` strings.
**Learning:** Manual blacklists are almost always incomplete. This implementation missed IPv6 (`[::1]`), other private ranges (`172.16.0.0/12`), and alternative IP formats (hex/octal). It also failed to check DNS resolution, allowing DNS rebinding attacks.
**Prevention:** Centralize security validation logic. We replaced the ad-hoc check with `validateUrlSecurity` from `@/lib/security`, which handles all these cases consistently across the application (used by both the API layer and the internal download service).

## 2026-02-19 - [IDOR in Research API Endpoints]
**Vulnerability:** The Research API endpoints (`/api/research/execute` and `/api/research/plan`) accepted a `projectId` without verifying if the authenticated user owned that project.
**Learning:** API routes that accept resource IDs must explicitly verify ownership or permissions, even if the user is authenticated. Service-layer functions often assume authorization is handled at the controller/API layer.
**Prevention:** Always fetch the resource and check `resource.userId === currentUser.id` (or RBAC) before performing actions.
