import { NextResponse } from 'next/server';

export async function POST(req) {
    const { username, password } = await req.json();

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'aiswarya';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sarees@2024';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const response = NextResponse.json({ success: true });
        response.cookies.set('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/'
        });
        return response;
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
