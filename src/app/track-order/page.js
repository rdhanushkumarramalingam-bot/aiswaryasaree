'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Search, Package, CheckCircle2, Clock, MapPin, Phone, User, ArrowLeft, Loader2, Truck } from 'lucide-react';
import Link from 'next/link';

function TrackOrderContent() {
    const searchParams = useSearchParams();
    const [orderId, setOrderId] = useState(searchParams.get('id') || '');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        if (orderId) {
            handleTrack();
        }
    }, []);

    const handleTrack = async (e) => {
        if (e) e.preventDefault();
        if (!orderId) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const { data, error: sbError } = await supabase
                .from('orders')
                .select(`*, order_items(*)`)
                .eq('id', orderId.trim().toUpperCase())
                .single();

            if (sbError || !data) {
                setError('Order not found. Please check your Order ID.');
            } else {
                setOrder(data);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!hasMounted) {
        return (
            <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-app))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'DELIVERED': return <CheckCircle2 size={24} style={{ color: 'hsl(var(--success))' }} />;
            case 'SHIPPED': return <Truck size={24} style={{ color: 'hsl(var(--secondary))' }} />;
            case 'CANCELLED': return <CheckCircle2 size={24} style={{ color: 'hsl(var(--danger))' }} />;
            default: return <Clock size={24} style={{ color: 'hsl(var(--warning))' }} />;
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-app))', color: '#fff', pb: '4rem' }}>
            {/* Minimal Header */}
            <div style={{
                padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                background: 'hsl(var(--bg-panel))', position: 'sticky', top: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <Link href="/shop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                    <ArrowLeft size={18} /> Back to Shop
                </Link>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'hsl(var(--primary))' }}>🌸 Cast Prince</div>
                <div style={{ width: 80 }}></div> {/* spacer */}
            </div>

            <main style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Track Order</h1>
                    <p style={{ color: 'hsl(var(--text-muted))' }}>Check the real-time status of your saree purchase.</p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleTrack} style={{
                    display: 'flex', gap: '0.75rem', marginBottom: '2.5rem',
                    background: 'hsl(var(--bg-card))', padding: '0.5rem', borderRadius: '16px',
                    border: '1px solid hsl(var(--border-subtle))', boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                }}>
                    <input
                        type="text"
                        placeholder="Enter Order ID (e.g. ORD-123)"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', color: '#fff',
                            padding: '0.75rem 1rem', fontSize: '1.1rem', outline: 'none'
                        }}
                    />
                    <button
                        disabled={loading}
                        style={{
                            background: 'hsl(var(--primary))', color: 'hsl(var(--bg-app))',
                            width: '48px', height: '48px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
                    </button>
                </form>

                {error && (
                    <div style={{
                        background: 'hsl(var(--danger) / 0.1)', color: 'hsl(var(--danger))',
                        padding: '1.5rem', borderRadius: '12px', textAlign: 'center',
                        border: '1px solid hsl(var(--danger) / 0.2)', marginBottom: '2rem'
                    }}>
                        {error}
                    </div>
                )}

                {order && (
                    <div className="animate-enter">
                        {/* Status Card */}
                        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'hsl(var(--primary) / 0.1)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                                border: '2px solid hsl(var(--primary) / 0.3)'
                            }}>
                                {getStatusIcon(order.status)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Order #{order.id}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 1rem' }}>
                                {order.status}
                            </div>
                            <p style={{ fontSize: '0.9rem' }}>
                                Ordered on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>

                        {/* Details */}
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid hsl(var(--border-subtle))', pb: '0.75rem' }}>Delivery Information</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <User size={18} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.95rem' }}>{order.customer_name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <MapPin size={18} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.95rem' }}>{order.delivery_address}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <Phone size={18} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.95rem' }}>{order.customer_phone}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid hsl(var(--border-subtle))', pb: '0.75rem' }}>Items Purchased</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {order.order_items?.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.product_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Qty: {item.quantity} × ₹{item.price_at_time.toLocaleString()}</div>
                                            </div>
                                            <div style={{ fontWeight: 700 }}>₹{(item.quantity * item.price_at_time).toLocaleString()}</div>
                                        </div>
                                    ))}
                                    <div style={{
                                        marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid hsl(var(--border-subtle))',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Amount</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'hsl(var(--primary))' }}>₹{order.total_amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function TrackOrderPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>Loading...</div>}>
            <TrackOrderContent />
        </Suspense>
    );
}
