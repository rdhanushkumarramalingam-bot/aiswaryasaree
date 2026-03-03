import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendWhatsAppText } from '@/lib/whatsapp';

export async function POST(req) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // Clean phone number (strip spaces, ensure 10-12 digits)
        const cleanPhone = phone.trim().replace(/\s+/g, '').replace('+', '');
        if (cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
        }

        // 1. Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Set expiry (5 minutes from now)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 3. Store OTP in DB (overwrite existing for this phone)
        const { error: dbError } = await supabase
            .from('otps')
            .upsert({
                phone: cleanPhone,
                code: otpCode,
                expires_at: expiresAt
            }, { onConflict: 'phone' });

        if (dbError) {
            // If upsert fails due to missing phone constraint, just insert
            const { error: insertError } = await supabase
                .from('otps')
                .insert({
                    phone: cleanPhone,
                    code: otpCode,
                    expires_at: expiresAt
                });

            if (insertError) {
                console.error('DB OTP Error (insert):', insertError);
                return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
            }
        }

        // 4. Send OTP via WhatsApp
        const message = `🌸 *Aiswarya Sarees* 🌸\n\nYour verification code is: *${otpCode}*\n\nThis code expires in 5 minutes. Please do not share it with anyone.`;

        const result = await sendWhatsAppText(cleanPhone, message);

        if (result.error) {
            console.error('WhatsApp Error:', result.error);
            return NextResponse.json({ error: 'Failed to send WhatsApp message. Please check your credentials.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
