'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Script from 'next/script';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function PaymentPageInner({ orderId }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [activeGateway, setActiveGateway] = useState(null); // 'razorpay' | 'phonepe'
    const [sdkReady, setSdkReady] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Handle PhonePe redirect callback
        const status = searchParams.get('status');
        const reason = searchParams.get('reason');
        if (status === 'success') {
            setPaymentStatus('success');
        } else if (status === 'failed') {
            setError(`Payment failed: ${reason || 'Please try again'}`);
        }

        async function fetchOrder() {
            const { data, fetchError } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId)
                .single();

            if (fetchError || !data) {
                setPaymentStatus('failed');
                setError('Order not found.');
            } else {
                setOrder(data);
                if (data.status === 'PAID') setPaymentStatus('success');
            }
            setLoading(false);
        }
        fetchOrder();
    }, [orderId, searchParams]);

    // ────────────── Razorpay Handler ──────────────
    const handleRazorpay = useCallback(async () => {
        if (!sdkReady) {
            setError('Payment system is loading. Please try again in a moment.');
            return;
        }
        setActiveGateway('razorpay');
        setError('');

        try {
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: 'Aiswarya Saree',
                description: `Order #${orderId}`,
                image: '/favicon.ico',
                order_id: data.razorpayOrderId,
                prefill: {
                    name: order?.customer_name || '',
                    contact: order?.customer_phone || '',
                },
                theme: { color: '#c2185b' },
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderId,
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            setPaymentStatus('success');
                        } else {
                            throw new Error(verifyData.error || 'Verification failed');
                        }
                    } catch (err) {
                        setError('Payment received but verification failed. Contact support with Payment ID: ' + response.razorpay_payment_id);
                        setActiveGateway(null);
                    }
                },
                modal: { ondismiss: () => setActiveGateway(null) },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => {
                setError(`Payment failed: ${resp.error.description}`);
                setActiveGateway(null);
            });
            rzp.open();
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setActiveGateway(null);
        }
    }, [sdkReady, orderId, order]);

    // ────────────── PhonePe Handler ──────────────
    const handlePhonePe = useCallback(async () => {
        setActiveGateway('phonepe');
        setError('');

        try {
            const res = await fetch('/api/payment/phonepe-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'PhonePe initiation failed');

            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                throw new Error('No redirect URL from PhonePe');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setActiveGateway(null);
        }
    }, [orderId]);

    // ── Loading ──
    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d', color: 'white' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, border: '3px solid #c2185b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#666' }}>Loading your order...</p>
            </div>
        </div>
    );

    // ── Order Not Found ──
    if (!order && paymentStatus === 'failed' && !error.includes('failed')) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d', color: '#ef4444', fontSize: '1.2rem' }}>
            Order not found.
        </div>
    );

    // ── Success Screen ──
    if (paymentStatus === 'success') return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a0a14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 24, padding: '3rem 2.5rem', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
                <div style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid rgba(16,185,129,0.4)' }}>
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Payment Successful! 🎉</h1>
                <p style={{ color: '#888', marginBottom: '1.5rem' }}>Order <span style={{ color: 'white', fontFamily: 'monospace' }}>#{orderId}</span> has been confirmed.</p>

                <div style={{ background: '#111', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid #222' }}>
                    <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Order Summary</p>
                    {(order?.order_items || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < (order?.order_items?.length || 0) - 1 ? '1px solid #1e1e1e' : 'none' }}>
                            <span style={{ color: '#bbb', fontSize: '0.9rem' }}>{item.product_name} <span style={{ color: '#555' }}>×{item.quantity}</span></span>
                            <span style={{ color: 'white', fontWeight: 700 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #333' }}>
                        <span style={{ color: '#888', fontWeight: 600 }}>Total Paid</span>
                        <span style={{ color: '#c2185b', fontWeight: 800, fontSize: '1.1rem' }}>₹{order?.total_amount?.toLocaleString()}</span>
                    </div>
                </div>

                <p style={{ color: '#555', fontSize: '0.82rem', marginBottom: '2rem' }}>📲 Invoice sent to your WhatsApp number</p>

                <button
                    onClick={() => router.push('/shop')}
                    style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #c2185b, #e91e8c)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
                >
                    Continue Shopping →
                </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // ── Main Checkout Page ──
    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setSdkReady(true)} strategy="afterInteractive" />

            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a0a14 100%)', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ maxWidth: 480, margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Checkout</h2>
                        <p style={{ color: '#c2185b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Aiswarya Saree — Secure Payment</p>
                    </div>

                    {/* Order Summary Card */}
                    <div style={{ background: '#1a1a1a', borderRadius: 20, overflow: 'hidden', border: '1px solid #2a2a2a', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, #b71c1c, #c2185b)', padding: '2rem', textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>Total Amount</p>
                            <h3 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, margin: 0 }}>₹{order?.total_amount?.toLocaleString()}</h3>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Order Items</p>
                            {(order?.order_items || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: i < (order?.order_items?.length || 0) - 1 ? '1px solid #222' : 'none' }}>
                                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>{item.product_name} <span style={{ color: '#555' }}>×{item.quantity}</span></span>
                                    <span style={{ color: 'white', fontWeight: 700 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                                <span style={{ color: '#888' }}>Customer</span>
                                <span style={{ color: '#ccc', fontWeight: 600 }}>{order?.customer_name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: 12, marginBottom: '1rem', fontSize: '0.875rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Payment Buttons */}
                    <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', textAlign: 'center' }}>Choose Payment Method</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Razorpay Button */}
                        <button
                            onClick={handleRazorpay}
                            disabled={!!activeGateway}
                            style={{
                                width: '100%', padding: '1rem 1.5rem', borderRadius: 16, border: '1px solid rgba(194,24,91,0.3)', cursor: activeGateway ? 'not-allowed' : 'pointer',
                                background: activeGateway === 'razorpay' ? '#222' : 'linear-gradient(135deg, rgba(194,24,91,0.15), rgba(233,30,140,0.1))',
                                color: 'white', fontWeight: 700, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#072654', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#3395FF', fontFamily: 'monospace' }}>R</div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: 0, fontWeight: 700 }}>Razorpay</p>
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.75rem' }}>UPI · Cards · Net Banking · Wallets</p>
                                </div>
                            </div>
                            {activeGateway === 'razorpay'
                                ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : <span style={{ color: '#c2185b', fontSize: '1.2rem' }}>→</span>
                            }
                        </button>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
                            <span style={{ color: '#444', fontSize: '0.75rem' }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
                        </div>

                        {/* PhonePe Button */}
                        <button
                            onClick={handlePhonePe}
                            disabled={!!activeGateway}
                            style={{
                                width: '100%', padding: '1rem 1.5rem', borderRadius: 16, border: '1px solid rgba(94,23,235,0.3)', cursor: activeGateway ? 'not-allowed' : 'pointer',
                                background: activeGateway === 'phonepe' ? '#222' : 'linear-gradient(135deg, rgba(94,23,235,0.15), rgba(124,58,237,0.1))',
                                color: 'white', fontWeight: 700, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#5e17eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>Pe</div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: 0, fontWeight: 700 }}>PhonePe</p>
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.75rem' }}>UPI · PhonePe Wallet · QR Pay</p>
                                </div>
                            </div>
                            {activeGateway === 'phonepe'
                                ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : <span style={{ color: '#7c3aed', fontSize: '1.2rem' }}>→</span>
                            }
                        </button>
                    </div>

                    {/* Accepted Methods */}
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            {['UPI', 'PhonePe', 'GPay', 'Paytm', 'VISA', 'Mastercard', 'Net Banking'].map(m => (
                                <span key={m} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#666', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem' }}>{m}</span>
                            ))}
                        </div>
                        <p style={{ color: '#333', fontSize: '0.7rem' }}>🔒 Secured by Razorpay & PhonePe · 256-bit SSL</p>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

export default function PaymentPage({ params }) {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
                <div style={{ width: 48, height: 48, border: '3px solid #c2185b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <PaymentPageInner orderId={params.orderId} />
        </Suspense>
    );
}
