import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const config = {
    matcher: [
        // Match all paths except static files
        // We include /api/auth here to ensure rate limiting applies
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

export default async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-current-path', path);

    // Rate Limiting Logic (only for /api/)
    if (path.startsWith('/api/')) {
        // Identify IP
        const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

        let limit = 60; // Default: 60 req/min
        let window = 60 * 1000;
        let key = `general:${ip}`;

        // Configure limits per route category
        if (path.startsWith('/api/auth/')) {
            limit = 20; // 20 req/15min
            window = 15 * 60 * 1000;
            key = `auth:${ip}`;
        } else if (path.startsWith('/api/generate/') || path.startsWith('/api/chat/')) {
            limit = 10; // 10 req/min
            window = 60 * 1000;
            key = `ai:${ip}`;
        }

        const result = await rateLimit(key, { limit, window });

        if (!result.success) {
            return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': result.remaining.toString(),
                    'X-RateLimit-Reset': result.reset.toString(),
                },
            });
        }

        // Pass to next middleware/handler with modified request headers
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // Add rate limit headers to response
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.reset.toString());

        return response;
    }

    // Default behavior for non-API routes
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}
