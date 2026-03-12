import { NextResponse } from 'next/server';
import { notifyOrderSuccess } from '@/services/whatsappService';

export async function POST(req) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        console.log(`[API] Triggering direct notification for order confirmation: #${orderId}`);
        await notifyOrderSuccess(orderId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Order notify error:', error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
