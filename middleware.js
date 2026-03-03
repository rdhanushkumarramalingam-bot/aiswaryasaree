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
    const isAdmin = adminSession?.value === 'authenticated';
    const isUser = !!userSession?.value;

    // 1. If trying to access /admin but not an admin:
    if (pathname.startsWith('/admin') && !isAdmin) {
        // If they are a regular user, send to shop. If not logged in, send to login.
        return NextResponse.redirect(new URL(isUser ? '/shop' : '/login', request.url));
    }

    // 2. If not authenticated at all and trying to access protected:
    if (isProtected && !isAdmin && !isUser) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
