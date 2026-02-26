'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PaymentPage({ params }) {
    const { orderId } = params;
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed

    useEffect(() => {
        async function fetchOrder() {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId)
                .single();

            if (error || !data) {
                console.error('Order fetch error:', error);
                setPaymentStatus('failed');
            } else {
                setOrder(data);
                // If already paid, show success directly
                if (data.status === 'PAID') {
                    setPaymentStatus('success');
                }
            }
            setLoading(false);
        }
        fetchOrder();
    }, [orderId]);

    const handlePayment = async (method) => {
        setPaymentStatus('processing');

        // Simulate specific app deeplinks (In production, use specific URI schemes)
        const upiId = '917558189732@upi';
        const name = 'Aiswarya Sarees';
        const amount = order.total_amount;
        const note = `Order #${orderId}`;

        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&tr=${orderId}&tn=${encodeURIComponent(note)}&cu=INR`;

        // Attempt to open UPI app
        window.location.href = upiLink;

        // Show confirmation dialog after a short delay (simulating user return)
        setTimeout(() => {
            const confirmed = window.confirm("Did you complete the payment in your app?");
            if (confirmed) {
                verifyPayment();
            } else {
                setPaymentStatus('pending');
            }
        }, 3000);
    };

    const verifyPayment = async () => {
        try {
            const res = await fetch('/api/payment/success', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, transactionId: `TXN_${Date.now()}` })
            });

            if (res.ok) {
                setPaymentStatus('success');
            } else {
                alert('Payment verification failed. Please try again.');
                setPaymentStatus('pending');
            }
        } catch (err) {
            console.error(err);
            setPaymentStatus('pending');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="animate-pulse">Loading Order...</div>
        </div>
    );

    if (!order) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500">Order not found.</div>;

    if (paymentStatus === 'success') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-900/20 to-black pointer-events-none"></div>

                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl max-w-md w-full relative z-10">
                    <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
                    <p className="text-gray-400 mb-6">Order <span className="text-white font-mono">#{orderId}</span> has been confirmed.</p>
                    <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Invoice sent to WhatsApp</p>
                    <button
                        onClick={() => window.open(`https://wa.me/15551678232`, '_self')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '1rem', border: 'none', background: '#e0f7fa', color: '#00796b', borderRadius: '12px', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }}
                    >
                        Return to WhatsApp
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden text-gray-200">
            {/* Background Ambient Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[100px]"></div>

            <div className="max-w-md mx-auto space-y-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Checkout</h2>
                    <p className="mt-2 text-sm text-red-500 uppercase tracking-widest font-semibold">Aiswarya Sarees Secure Payment</p>
                </div>

                {/* Amount Card */}
                <div className="bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-neutral-800">
                    <div className="bg-gradient-to-r from-red-700 to-red-900 px-6 py-10 text-center text-white relative overflow-hidden">
                        {/* Pattern Overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                        <p className="text-red-100 text-xs font-medium uppercase tracking-widest mb-1 opacity-80">Total Amount Payable</p>
                        <h3 className="text-5xl font-bold mt-2 tracking-tight">₹{order.total_amount.toLocaleString()}</h3>
                    </div>
                    <div className="px-6 py-6 bg-neutral-900">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Order Summary</h4>
                        <div className="space-y-3">
                            {order.order_items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                                    <span className="text-gray-300 font-medium">{item.product_name} <span className="text-neutral-600 text-xs ml-1">x{item.quantity}</span></span>
                                    <span className="text-white font-bold font-mono">₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-dashed border-neutral-700 mt-6 pt-4 flex justify-between items-center">
                            <span className="text-gray-500 font-medium text-xs uppercase">Customer</span>
                            <span className="text-gray-300 font-semibold">{order.customer_name}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4 pt-4">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-2">Select Payment Method</p>

                    {/* GPay */}
                    <button
                        onClick={() => handlePayment('gpay')}
                        className="w-full group bg-neutral-900 border border-neutral-800 hover:border-blue-500 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-neutral-800 active:scale-[0.98]"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center text-xl border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                G
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors">Google Pay</p>
                                <p className="text-xs text-gray-500">Instant UPI Payment</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-neutral-700 group-hover:border-blue-500 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        </div>
                    </button>

                    {/* PhonePe */}
                    <button
                        onClick={() => handlePayment('phonepe')}
                        className="w-full group bg-neutral-900 border border-neutral-800 hover:border-purple-500 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-neutral-800 active:scale-[0.98]"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-purple-900/20 flex items-center justify-center text-xl border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                P
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white group-hover:text-purple-400 transition-colors">PhonePe</p>
                                <p className="text-xs text-gray-500">Instant UPI Payment</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-neutral-700 group-hover:border-purple-500 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                        </div>
                    </button>

                    {/* Net Banking */}
                    <button
                        onClick={() => handlePayment('netbanking')}
                        className="w-full group bg-neutral-900 border border-neutral-800 hover:border-red-500 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-neutral-800 active:scale-[0.98]"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center text-xl border border-red-500/30 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                🏦
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white group-hover:text-red-400 transition-colors">Net Banking</p>
                                <p className="text-xs text-gray-500">All Major Banks Supported</p>
                            </div>
                        </div>
                        <span className="text-neutral-600 group-hover:text-red-400 transition-colors text-sm font-medium">Select &rarr;</span>
                    </button>

                </div>

                <p className="text-center text-xs text-neutral-600 mt-8">
                    Secure Payment Gateway by Aiswarya Sarees<br />
                    Need help? WhatsApp <span className="text-red-500">+1 555 167 8232</span>
                </p>
            </div>
        </div>
    );
}
