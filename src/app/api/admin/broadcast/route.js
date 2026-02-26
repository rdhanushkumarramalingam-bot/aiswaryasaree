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
                    type: "cta_url",
                    header: {
                        type: "image",
                        image: { link: product.image_url }
                    },
                    body: {
                        text: `*${product.name}*\n\n${message}`
                    },
                    footer: { text: "Cast Prince • Exclusive Collection" },
                    action: {
                        name: "cta_url",
                        parameters: {
                            display_text: "🛒 Shop Now",
                            url: shopUrl
                        }
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
