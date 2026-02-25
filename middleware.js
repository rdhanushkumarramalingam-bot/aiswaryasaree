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

    // Check session cookie
    const session = request.cookies.get('admin_session');
    const isAuthenticated = session?.value === 'authenticated';

    // Protected paths: / and /admin/*
    const isProtected = pathname === '/' || pathname.startsWith('/admin');

    if (isProtected && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
