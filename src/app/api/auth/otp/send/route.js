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


        // Set Static OTP as requested
        const otp = "758369";
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry for safety

        // Store OTP in database (optional but good for tracking)
        await supabase.from('otp_verifications').insert({
            phone: fullPhone,
            otp_code: otp,
            expires_at: expiresAt,
            is_used: false
        });


        // Disable WhatsApp sending to avoid expired token errors
        // const waMsg = `💮 *Your Cast Prince Login Code*\n\nYour verification code is: *${otp}*\n\nPlease enter this on the website to continue.`;
        // const waResult = await sendText(fullPhone, waMsg);

        console.log(`[AUTH] Static OTP session (WhatsApp skipped): ${otp} for ${fullPhone}`);

        return NextResponse.json({ success: true, message: 'OTP ready (Static: 758369)' });



    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }
}

