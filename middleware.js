import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Always public paths — never redirect these
    const isPublicRoute =
        pathname === '/login' ||
        pathname === '/forgot-password' ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/whatsapp') ||
        pathname.startsWith('/api/orders') ||
        pathname.startsWith('/api/payment') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico';

    if (isPublicRoute) return NextResponse.next();

    // Protected paths: / , /admin/*, and /track-order
    // We will handle client-side protection in the components to avoid cookies
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
