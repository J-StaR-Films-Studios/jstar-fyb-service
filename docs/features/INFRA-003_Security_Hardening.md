# INFRA-003 Security Hardening

## Overview

Security hardening implementation addressing critical vulnerabilities discovered during the security audit (February 2026).

## Date
2026-02-27

## Status
✅ Implemented

---

## Changes

### 1. SSRF Protection (CRITICAL)

**Problem**: Document fetch endpoints could be exploited to access internal services (AWS metadata, internal APIs).

**Files Modified**:
- `src/app/api/documents/[id]/serve/route.ts`
- `src/app/api/documents/[id]/fetch-pdf/route.ts`

**Implementation**:
- Added `validateUrlSecurity()` from `@/lib/security` before fetching external URLs
- Added academic domain allowlist for PDF fetch endpoint
- Returns 400 error for blocked URLs

**Code Pattern**:
```typescript
try {
    await validateUrlSecurity(doc.fileUrl);
} catch (securityError) {
    logger.error(`SSRF blocked for document ${id}: ${doc.fileUrl}`, "[ServeDocument]");
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
}
```

---

### 2. Authentication on Document Endpoints (HIGH)

**Problem**: Document serve and fetch endpoints had no authentication checks.

**Files Modified**:
- `src/app/api/documents/[id]/serve/route.ts`
- `src/app/api/documents/[id]/fetch-pdf/route.ts`

**Implementation**:
- Added `getSession()` authentication check
- Added project ownership verification
- Admin bypass for authorized personnel

**Code Pattern**:
```typescript
const session = await getSession();
if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

const isOwner = doc.project.userId === session.user.id;
const isAdmin = (session.user as { role?: string }).role === 'ADMIN';
if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
}
```

---

### 3. Rate Limiting (HIGH)

**Problem**: No protection against API abuse, brute force, or cost attacks on AI endpoints.

**New File**: `src/lib/rate-limit.ts`

**Configuration**:
| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| AI (chat/generate) | 20 requests | 1 minute |
| Payment | 5 requests | 1 minute |
| Auth | 10 requests | 1 minute |
| Upload | 10 requests | 1 minute |

**Files Modified**:
- `src/app/api/chat/route.ts`
- `src/app/api/projects/[id]/chat/route.ts`
- `src/app/api/generate/chapter/route.ts`
- `src/app/api/generate/diagram/route.ts`
- `src/app/api/generate/diagram-from-image/route.ts`
- `src/app/api/generate/outline/route.ts`
- `src/app/api/generate/abstract/route.ts`
- `src/app/api/pay/initialize/route.ts`

**Paid public AI routes**: `/api/chat`, `/api/analyze-topic`, `/api/extract-topic`, `/api/generate/abstract`, `/api/generate/outline`, `/api/generate/diagram`, and `/api/generate/diagram-from-image` share a 20/min anonymous cap plus a 20/min per-reported-IP cap. Authenticated abstract and outline requests instead use a 20/min per-user cap; both diagram routes use the anonymous cap even with a session (the diagram route runs on Edge). These checks return 503 if Redis is missing or unavailable. The outline's client-supplied project ID is looked up by both ID and authenticated user ID; a missing or non-owned ID falls back to the user's topic match or new project.

**Code pattern for abstract and outline**:
```typescript
const user = await getCurrentUser();
const rateLimitResponse = user
    ? await applyRateLimit(user.id, 'ai', { failClosed: true })
    : await applyAnonymousAiRateLimit(req);
if (rateLimitResponse) return rateLimitResponse;
```

Other public routes call `applyAnonymousAiRateLimit(req)` directly.

---

### 4. Logging Improvements (MEDIUM)

**Problem**: Console.log statements could leak sensitive information in production.

**Files Modified**:
- `src/app/api/admin/influencers/route.ts`
- `src/app/api/admin/discounts/route.ts`
- `src/app/api/pay/initialize/route.ts`
- `src/app/api/generate/outline/route.ts`
- And other API endpoints

**Implementation**: Replaced `console.error/console.log` with `logger` utility from `@/lib/logger`

---

## Environment Configuration

### Redis Rate Limiting

Get free tier at [upstash.com](https://upstash.com):

```
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

Most legacy routes still allow requests without Redis. The seven paid public AI endpoints listed above return 503 if Redis is missing or unavailable. So do project chat, chapter generation, research-plan generation, document extraction, chapter enhancement and hub chat. Anonymous requests across the seven public endpoints share a 20/min cap in addition to a per-reported-IP cap; forged forwarding headers cannot bypass the shared cap. Authenticated abstract and outline requests use a separate per-user cap.

---

## Security Status

| Vulnerability | Severity | Status |
|---------------|----------|--------|
| SSRF in document fetch | CRITICAL | ✅ Fixed |
| Missing auth on documents | HIGH | ✅ Fixed |
| No rate limiting | HIGH | ✅ Fixed |
| XSS in DiagramPreview | MEDIUM | ✅ Already protected (DOMPurify) |
| Console logging | MEDIUM | ✅ Fixed |
| Inline scripts | MEDIUM | ✅ Already using Next.js Script |

---

## Testing

1. **SSRF Test**: Try to access internal URLs (e.g., `http://169.254.169.254/`) - should return 400
2. **Auth Test**: Access document endpoints without session - should return 401
3. **Rate Limit Test**: Send >20 requests/min to AI endpoints - should return 429

---

## Related Docs

- `docs/SECURITY_AUDIT_REPORT.md` - Original audit report
- `src/lib/security.ts` - URL validation utilities
- `src/lib/rate-limit.ts` - Rate limiting implementation
