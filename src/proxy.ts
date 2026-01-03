import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        // Match all paths except static files
        '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
    ],
};

export default async function proxy(req: NextRequest) {
    // Inject current path for Server Components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-current-path', req.nextUrl.pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}
