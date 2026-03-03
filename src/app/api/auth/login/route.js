import { NextResponse } from 'next/server';

export async function POST(req) {
    const { username, password } = await req.json();

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'aiswarya';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sarees@2024';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return NextResponse.json({ success: true, role: 'admin' });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
