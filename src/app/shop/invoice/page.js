'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle2, Download, Printer, Saree, MapPin, Phone, MessageCircle } from 'lucide-react';
import styles from '../shop.module.css';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('oid');

    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        if (!orderId) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
            if (orderData) {
                setOrder(orderData);
                const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId);
                setItems(itemData || []);
            }
            setLoading(false);
        };
        loadData();
    }, [orderId]);

    if (!hasMounted) return null;

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
                <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>Invoice Not Found</h2>
                    <p>The order ID seems invalid.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '1rem', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Status Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e20', color: '#22c55e', marginBottom: '1rem' }}>
                        <CheckCircle2 size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>E-Invoice Generated</h1>
                    <p style={{ color: '#888', margin: '0.25rem 0 0' }}>Order #{order.id}</p>
                </div>

                {/* Main Invoice Card */}
                <div style={{ background: '#111', borderRadius: '20px', padding: '1.5rem', border: '1px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>

                    {/* Brand */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px dashed #333', paddingBottom: '1.5rem' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'hsl(var(--primary))' }}>🌸 Aiswarya Sarees</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Premium Ethnic Wear</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>Date</div>
                            <div style={{ fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bill To</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.customer_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            <Phone size={14} /> {order.customer_phone}
                        </div>
                        {order.delivery_address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.4 }}>
                                <MapPin size={14} style={{ flexShrink: 0 }} /> {order.delivery_address}
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Order Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#1a1a1a', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.quantity} x ₹{item.price_at_time.toLocaleString()}</div>
                                    </div>
                                    <div style={{ fontWeight: 700 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{ background: '#1a1a1a', borderRadius: '15px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                            <span>Payment Status</span>
                            <span style={{ color: order.status === 'PAID' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{order.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#888', fontSize: '0.85rem' }}>
                            <span>Payment Method</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{order.payment_method}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #333', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#aaa' }}>Total Amount Paid</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>₹{order.total_amount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer / QR style branding */}
                    <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(to bottom, transparent, #151515)', borderRadius: '0 0 20px 20px' }}>
                        <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>This is a computer-generated digital invoice.</p>
                        <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.5rem' }}>Thank you for shopping with <strong>Aiswarya Sarees</strong>.</p>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
                    <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '15px', background: '#333', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        <Printer size={18} /> Print Bill
                    </button>
                    <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '15px', background: '#25D366', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        Need help? Contact on WhatsApp
                    </a>
                </div>
            </div>

            <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>Loading...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}
