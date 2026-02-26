import { NextResponse } from 'next/server';
import { sendRawMessage } from '@/services/whatsappService';

// Admin Broadcast Route - Handles sending bulk messages to customers
// v1.2 - Final Unified Export Fix

export async function POST(req) {
    try {
        const { to, product, message, shopUrl } = await req.json();

        if (!to) return NextResponse.json({ error: 'Recipient required' }, { status: 400 });

        // Build the broadcast message
        let payload;

        if (product && product.image_url) {
            // Send with Image
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "button",
                    header: {
                        type: "image",
                        image: { link: product.image_url }
                    },
                    body: {
                        text: `*${product.name}*\n\n${message}\n\n🌐 View our collection:\n${shopUrl.split('?')[0]}` // Ensure no ?pid= attached just in case
                    },
                    footer: { text: "Cast Prince • Exclusive Collection" },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: { id: `bc_addcart_${product.id}`, title: "🛒 Add to Cart" }
                            },
                            {
                                type: "reply",
                                reply: { id: "menu_shop_web", title: "🛍️ Shop Now" }
                            }
                        ]
                    }
                }
            };
        } else {
            // Text only message
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "text",
                text: {
                    body: `${message}\n\n🛒 Shop our collection here:\n${shopUrl}`,
                    preview_url: true
                }
            };
        }

        const result = await sendRawMessage(to, payload);
        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Broadcast failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
