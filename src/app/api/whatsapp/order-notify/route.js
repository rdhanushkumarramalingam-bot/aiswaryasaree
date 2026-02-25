// /api/whatsapp/order-notify/route.js
// Called by the shop website when an order is placed.
// Sends a WhatsApp order confirmation to the customer.

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

async function sendText(to, text) {
    const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

    const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
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

    const data = await res.json();
    if (data.error) {
        console.error('WhatsApp API Error:', JSON.stringify(data.error));
    }
    return data;
}

export async function POST(request) {
    try {
        const { orderId, customerPhone, customerName, address, items, total, paymentMethod } = await request.json();

        if (!customerPhone) {
            return Response.json({ error: 'Missing customerPhone' }, { status: 400 });
        }

        // ── Build the order confirmation message ──────────────────────────────
        const itemsText = items.map(i => `  • ${i.name} x${i.qty} = ₹${(i.price * i.qty).toLocaleString()}`).join('\n');
        const paymentText = paymentMethod === 'COD' ? '💵 Cash on Delivery' : '📲 UPI / Online';

        const message =
            `🌸 *AISWARYA SAREES — ORDER CONFIRMED!*\n\n` +
            `✅ Your website order has been placed successfully!\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 *Order ID:* #${orderId}\n` +
            `👤 *Name:* ${customerName}\n` +
            `📍 *Delivery Address:*\n${address}\n\n` +
            `🛍️ *Items Ordered:*\n${itemsText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Total Amount:* ₹${total.toLocaleString()}\n` +
            `💳 *Payment:* ${paymentText}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            (paymentMethod === 'UPI'
                ? `📲 *UPI Payment Details:*\nUPI ID: *samypranesh@okicici*\nAmount: *₹${total.toLocaleString()}*\n\nPlease complete the payment and reply *PAID ✓* to confirm.\n\n`
                : `Our team will contact you to confirm your delivery date.\n\n`) +
            `💗 Thank you for shopping with *Aiswarya Sarees*!\n` +
            `Send *Hi* anytime to browse our collection again.`;

        await sendText(customerPhone, message);

        return Response.json({ success: true });

    } catch (error) {
        console.error('Order notification error:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
