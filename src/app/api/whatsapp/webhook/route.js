
// @/app/api/whatsapp/webhook/route.js
/*
  BACKEND API ROUTE: WHATSAPP WEBHOOK
  Receives all webhook events from Meta (WhatsApp).
  Supports Verification (GET) and Event Handling (POST).
*/

import { processIncomingMessage } from '@/services/whatsappService';

// 1. VERIFICATION (Required by Meta)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        console.log('--- Webhook Verification Request ---');
        console.log(`Mode: ${mode}`);
        console.log(`Token: ${token}`);
        console.log(`Challenge: ${challenge}`);

        // Verify token matches your config
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'aiswarya_secret';

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Webhook Verified Successfully!');
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        console.warn('❌ Webhook Verification Failed: Token mismatch or wrong mode.');
        return new Response('Forbidden', { status: 403 });

    } catch (error) {
        console.error('SERVER ERROR during verification:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

// 2. MESSAGE HANDLING
export async function POST(request) {
    try {
        const body = await request.json();
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        // Check if this is a WhatsApp message
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messages = value?.messages;

            if (messages && messages.length > 0) {
                // Process the message in the background to avoid timing out the WhatsApp webhook receiver (which has a 10s limit)
                processIncomingMessage(body).catch(err => console.error('Error in background processing:', err));
            }
            return new Response('EVENT_RECEIVED', { status: 200 });
        } else {
            return new Response('Not Found', { status: 404 });
        }

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
