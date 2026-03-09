import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// PhonePe endpoints
const PHONEPE_BASE_URL = process.env.PHONEPE_ENV === 'production'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

export async function POST(request) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return Response.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Fetch order from Supabase
        const { data: order, error } = await supabase
            .from('orders')
            .select('id, total_amount, customer_name, customer_phone')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (!merchantId || !saltKey) {
            return Response.json({ error: 'PhonePe credentials not configured in .env.local' }, { status: 500 });
        }

        const transactionId = `TXN_${orderId}_${Date.now()}`;

        // Clean phone number
        let mobileNumber = (order.customer_phone || '').replace(/\D/g, '');
        if (mobileNumber.startsWith('91') && mobileNumber.length === 12) mobileNumber = mobileNumber.slice(2);

        // Build the PhonePe payment payload
        const payload = {
            merchantId,
            merchantTransactionId: transactionId,
            merchantUserId: `MUID_${orderId}`,
            amount: Math.round(order.total_amount * 100), // paise
            redirectUrl: `${appUrl}/api/payment/phonepe-callback?orderId=${orderId}&txnId=${transactionId}`,
            redirectMode: 'REDIRECT',
            callbackUrl: `${appUrl}/api/payment/phonepe-callback?orderId=${orderId}&txnId=${transactionId}`,
            mobileNumber,
            paymentInstrument: {
                type: 'PAY_PAGE', // Opens PhonePe payment page (UPI, Cards, Wallets)
            },
        };

        // Encode payload to base64
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

        // Generate X-VERIFY header: SHA256(base64payload + endpoint + saltKey) + "###" + saltIndex
        const endpoint = '/pg/v1/pay';
        const hashInput = base64Payload + endpoint + saltKey;
        const xVerify = crypto.createHash('sha256').update(hashInput).digest('hex') + '###' + saltIndex;

        // Call PhonePe API
        const response = await fetch(`${PHONEPE_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'accept': 'application/json',
            },
            body: JSON.stringify({ request: base64Payload }),
        });

        const result = await response.json();

        if (!result.success) {
            console.error('PhonePe API Error:', result);
            return Response.json({ error: result.message || 'PhonePe initiation failed' }, { status: 400 });
        }

        // Store transaction ID in our DB for tracking
        await supabase
            .from('orders')
            .update({ phonepe_transaction_id: transactionId })
            .eq('id', orderId);

        // Return the redirect URL to the client
        const redirectUrl = result.data?.instrumentResponse?.redirectInfo?.url;

        return Response.json({ success: true, redirectUrl, transactionId });

    } catch (err) {
        console.error('PhonePe create payment error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
