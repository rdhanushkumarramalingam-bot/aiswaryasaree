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

        // Verify OTP (Static for now)
        const STATIC_OTP = "758369";
        if (otp !== STATIC_OTP) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Get or Create Customer
        let { data: customer } = await supabase.from('customers').select('*').eq('phone', fullPhone).single();

        if (!customer) {
            // This case shouldn't happen if they messaged WA first, but handle just in case
            const { data: newCustomer } = await supabase.from('customers').insert({
                phone: fullPhone,
                name: 'Web User',
                role: 'user'
            }).select().single();
            customer = newCustomer;
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
