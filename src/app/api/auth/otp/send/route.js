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

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        // Store OTP in database
        const { error: dbError } = await supabase.from('otp_verifications').insert({
            phone: fullPhone,
            otp_code: otp,
            expires_at: expiresAt,
            is_used: false
        });

        if (dbError) {
            console.error('[AUTH] DB Error storing OTP:', dbError);
            return NextResponse.json({ error: 'System error. Please try later.' }, { status: 500 });
        }

        // Send OTP via WhatsApp
        const waMsg = `💮 *Your Cast Prince Login Code*\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes. Please do not share it with anyone.`;
        const waResult = await sendText(fullPhone, waMsg);

        if (waResult?.error) {
            console.error('[AUTH] WhatsApp API Error:', waResult.error);
            return NextResponse.json({ error: 'Failed to send OTP via WhatsApp' }, { status: 500 });
        }

        console.log(`[AUTH] OTP sent to ${fullPhone}: ${otp}`);

        return NextResponse.json({ success: true, message: 'OTP sent successfully to your WhatsApp' });

    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }
}

