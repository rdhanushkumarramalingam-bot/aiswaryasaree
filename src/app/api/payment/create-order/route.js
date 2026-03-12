import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

import { getGatewaySettings } from '@/lib/settings';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const { orderId } = await request.json();
        const settings = await getGatewaySettings();

        if (!orderId) {
            return Response.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Fetch the order from Supabase
        const { data: order, error } = await supabase
            .from('orders')
            .select('id, total_amount, customer_name, customer_phone')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // Detect if keys are placeholders or missing
        const isPlaceholder = (key) => !key || key.includes('PASTE_YOUR_KEY');
        const hasValidKeys = !isPlaceholder(settings.razorpay_key_id) && !isPlaceholder(settings.razorpay_key_secret);

        if (!hasValidKeys) {
            console.log('Using Razorpay Test Mode Fallback');
            return Response.json({
                razorpayOrderId: `order_test_${Date.now()}`,
                amount: Math.round(order.total_amount * 100),
                currency: 'INR',
                keyId: 'rzp_test_placeholder',
                orderDetails: order,
                testMode: true
            });
        }

        const razorpay = new Razorpay({
            key_id: settings.razorpay_key_id,
            key_secret: settings.razorpay_key_secret,
        });

        // Create Razorpay order
        const rzpOrder = await razorpay.orders.create({
            amount: Math.round(order.total_amount * 100), // amount in paise
            currency: 'INR',
            receipt: `receipt_${orderId}`,
            notes: {
                orderId: orderId,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
            }
        });

        // Store razorpay order ID in our DB for verification later
        await supabase
            .from('orders')
            .update({ razorpay_order_id: rzpOrder.id })
            .eq('id', orderId);

        return Response.json({
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: settings.razorpay_key_id,
            orderDetails: order,
        });

    } catch (err) {
        console.error('Create Razorpay order error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
