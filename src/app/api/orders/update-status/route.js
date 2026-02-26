// API Route: Update Order Status + Send WhatsApp Notification
import { supabase } from '@/lib/supabaseClient';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials missing, skipping notification');
        return;
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "text",
                text: { body: text }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('WA notification error:', data.error);
        } else {
            console.log(`✅ WhatsApp notification sent to ${to}`);
        }
        return data;
    } catch (error) {
        console.error('WA notification failed:', error);
    }
}

async function getStatusMessage(orderId, status, order, items = []) {
    const totalAmount = order.total_amount || 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const invoiceUrl = `${appUrl}/shop/invoice?oid=${orderId}`;

    switch (status) {
        case 'PAID':
            // Generate an itemized table-like list for the WhatsApp message
            const itemList = items.map(i => `• ${i.product_name} (x${i.quantity}) - ₹${(i.price_at_time * i.quantity).toLocaleString()}`).join('\n');

            return [
                `🧾 *INVOICE: ${orderId}*`,
                `--------------------------`,
                `✅ *Payment Received!*`,
                ``,
                `*Items:*`,
                itemList,
                `--------------------------`,
                `*Total Paid:* ₹${totalAmount.toLocaleString()}`,
                `*Method:* ${order.payment_method || 'UPI/Online'}`,
                ``,
                `🔗 *View Full Bill:* ${invoiceUrl}`,
                ``,
                `Your order is being processed. Thank you! 🌸`,
                `— Cast Prince`
            ].join('\n');

        case 'CANCELLED':
            return [
                `❌ *ORDER CANCELLED*`,
                ``,
                `Order #${orderId} has been cancelled.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `If you did not request this cancellation, please contact us!`,
                ``,
                `— Cast Prince 🌸`
            ].join('\n');

        case 'SHIPPED':
            return [
                `🚚 *ORDER SHIPPED!*`,
                ``,
                `Order #${orderId} is on its way!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Track your delivery & see details:`,
                `${invoiceUrl}`,
                ``,
                `Thank you for shopping with us! 🌸`
            ].join('\n');

        case 'DELIVERED':
            return [
                `✅ *ORDER DELIVERED!*`,
                ``,
                `Order #${orderId} has been delivered successfully!`,
                `Total: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Hope you love your new saree! 💕`,
                `Type *Hi* to shop again anytime.`,
                ``,
                `— Cast Prince 🌸`
            ].join('\n');

        case 'PLACED':
            return [
                `📦 *ORDER CONFIRMED*`,
                ``,
                `Your order #${orderId} has been confirmed!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `We are preparing your saree for shipping.`,
                `— Cast Prince 🌸`
            ].join('\n');

        default:
            return `📋 Order #${orderId} status updated to: ${status}\n— Cast Prince`;
    }
}

export async function POST(request) {
    try {
        const { orderId, status } = await request.json();

        if (!orderId || !status) {
            return new Response(JSON.stringify({ error: 'Missing orderId or status' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Get the order details first
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch order items if we're sending a detailed receipt (PAID status)
        let items = [];
        if (status === 'PAID') {
            const { data: itemData } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);
            items = itemData || [];
        }

        // 3. Update the order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);

        if (updateError) {
            return new Response(JSON.stringify({ error: 'Failed to update order' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Send WhatsApp notification to customer
        const message = await getStatusMessage(orderId, status, order, items);
        await sendWhatsAppText(order.customer_phone, message);

        console.log(`✅ Order ${orderId} → ${status} | WhatsApp notification sent to ${order.customer_phone}`);

        return new Response(JSON.stringify({
            success: true,
            message: `Order updated to ${status} and customer notified via WhatsApp`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update order error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
