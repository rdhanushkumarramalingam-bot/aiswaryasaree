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
    const isProtected = pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/track-order');

    const adminSession = request.cookies.get('admin_session');
    const userSession = request.cookies.get('user_session');
    const isAuthenticated = !!(adminSession?.value === 'authenticated' || userSession?.value);

    if (isProtected && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        // Pass the current path as a redirect parameter
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
