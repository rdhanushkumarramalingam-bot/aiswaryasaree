import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export async function POST(req) {
    try {
        const { phone, otp, role } = await req.json();

        // Clean phone
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

        // Get Latest OTP for this phone
        const { data: otpEntry, error: otpError } = await supabase
            .from('otp_verifications')
            .select('*')
            .eq('phone', fullPhone)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpEntry) {
            return NextResponse.json({ error: 'Verification code not found or expired' }, { status: 400 });
        }

        if (otpEntry.otp_code !== otp) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Mark OTP as used
        await supabase.from('otp_verifications').update({ is_used: true }).eq('id', otpEntry.id);

        // Get or Create Customer
        let { data: customer } = await supabase.from('customers').select('*').eq('phone', fullPhone).single();

        if (!customer) {
            // New user account creation — they get an account if they can verify the phone
            const { data: newCustomer, error: insertError } = await supabase.from('customers').insert({
                phone: fullPhone,
                name: 'Valued Customer',
                role: 'user',
                is_verified: true
            }).select().single();

            if (insertError) {
                console.error('[AUTH] Customer creation error:', insertError);
                return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 });
            }
            customer = newCustomer;
        } else {
            // Update existing customer to verified if not already
            await supabase.from('customers').update({ is_verified: true }).eq('id', customer.id);
        }

        // Final role check (if trying to be admin but DB says user)
        if (role === 'admin' && customer.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
        }

        // Return user data - Frontend will handle local storage
        return NextResponse.json({
            success: true,
            customer: customer,
            redirect: '/shop'
        });

    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}

