import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendText } from '@/services/whatsappService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
    try {
        const { phone } = await req.json();

        if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });

        // Clean phone number
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

        // Generate 6-digit OTP (Static for now as requested)
        const otp = "758369";
        console.log(`[AUTH] Static OTP session started for ${fullPhone}: ${otp}`);

        return NextResponse.json({ success: true, message: 'OTP sent (Static: 758369)' });

    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }
}
