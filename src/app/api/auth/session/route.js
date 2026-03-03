import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const userSession = cookieStore.get('user_session');

    if (adminSession?.value === 'authenticated') {
        return NextResponse.json({ authenticated: true, role: 'admin' });
    }

    if (userSession?.value) {
        try {
            const userData = JSON.parse(userSession.value);
            return NextResponse.json({ authenticated: true, role: 'user', user: userData });
        } catch (e) {
            return NextResponse.json({ authenticated: false });
        }
    }

    return NextResponse.json({ authenticated: false });
}
