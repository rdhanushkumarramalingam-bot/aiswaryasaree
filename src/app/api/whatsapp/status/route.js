import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const config = {
            WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? `LOADED (${process.env.WHATSAPP_PHONE_NUMBER_ID.substring(0, 4)}...)` : 'NOT_FOUND',
            WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? `LOADED (${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 10)}...)` : 'NOT_FOUND',
            WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? `LOADED` : 'NOT_FOUND',
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'LOADED' : 'NOT_FOUND',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'LOADED' : 'NOT_FOUND',
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
            NODE_ENV: process.env.NODE_ENV
        };

        return NextResponse.json({
            status: 'Diagnostic Active',
            timestamp: new Date().toISOString(),
            config
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
