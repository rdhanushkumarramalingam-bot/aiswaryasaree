'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Users, MessageSquare, Send, CheckCircle2, Loader2, Search, ArrowRight, Package, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function BroadcastPage() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [message, setMessage] = useState('Check out our newest collection! ✨');
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({ sent: 0, total: 0 });
    const [completed, setCompleted] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [broadcastGroupFilter, setBroadcastGroupFilter] = useState('ALL');

    useEffect(() => {
        setHasMounted(true);
        const load = async () => {
            // Get unique customers from orders table
            const { data: orderData } = await supabase.from('orders').select('customer_phone, customer_name');
            const unique = [];
            const seen = new Set();
            (orderData || []).forEach(o => {
                if (o.customer_phone && !seen.has(o.customer_phone)) {
                    seen.add(o.customer_phone);
                    unique.push(o);
                }
            });
            setCustomers(unique);

            // Get products
            const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
            setProducts(prodData || []);
            setLoading(false);
        };
        load();
    }, []);

    const startBroadcast = async () => {
        if (!confirm(`Are you sure you want to send this broadcast to ${customers.length} customers?`)) return;

        setSending(true);
        setCompleted(false);
        setStats({ sent: 0, total: customers.length });

        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];

            try {
                // Construct the message
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                const customerPhone = customer.customer_phone;
                const shopUrl = `${baseUrl}/shop?phone=${encodeURIComponent(customerPhone)}`;
                const addToCartUrl = selectedProduct ? `${baseUrl}/shop?pid=${selectedProduct.id}&action=addtocart&phone=${encodeURIComponent(customerPhone)}` : shopUrl;

                await fetch('/api/admin/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: customer.customer_phone,
                        product: selectedProduct,
                        message: message,
                        shopUrl: shopUrl,
                        addToCartUrl: addToCartUrl
                    })
                });

                setStats(prev => ({ ...prev, sent: i + 1 }));
            } catch (err) {
                console.error('Failed to send to', customer.customer_phone);
            }
        }

        setSending(false);
        setCompleted(true);
    };

    return (
        <div className="animate-enter">
            {!hasMounted || loading ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                    <p>{!hasMounted ? 'Initializing...' : 'Fetching audience data...'}</p>
                </div>
            ) : (
                <>
                    <div className="admin-header-row">
                        <div>
                            <h1>Broadcast Center 📢</h1>
                            <p>Send bulk updates to your {customers.length} customers</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Step 1: Select Product */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div className="badge badge-delivered" style={{ width: '24px', height: '24px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                    <h3 style={{ margin: 0 }}>Select Saree / Collection</h3>
                                </div>

                                {/* Group Filter Tabs */}
                                {(() => {
                                    const groupList = ['ALL', ...new Set(products.map(p => p.product_group).filter(Boolean))];
                                    return groupList.length > 1 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', alignItems: 'center' }}>
                                            <Tag size={14} style={{ color: 'hsl(var(--text-muted))' }} />
                                            {groupList.map(g => (
                                                <button key={g} onClick={() => setBroadcastGroupFilter(g)} style={{
                                                    padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    background: broadcastGroupFilter === g ? 'hsl(var(--accent))' : 'hsl(var(--bg-app))',
                                                    color: broadcastGroupFilter === g ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                                    border: broadcastGroupFilter === g ? '1px solid hsl(var(--accent))' : '1px solid hsl(var(--border-subtle))',
                                                }}>
                                                    {g === 'ALL' ? 'All Groups' : g}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
                                    {products.filter(p => broadcastGroupFilter === 'ALL' || p.product_group === broadcastGroupFilter).map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedProduct(p)}
                                            className="card"
                                            style={{
                                                padding: '0.75rem',
                                                cursor: 'pointer',
                                                border: selectedProduct?.id === p.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                                background: selectedProduct?.id === p.id ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--bg-panel))',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ height: '100px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: 'hsl(var(--primary))', fontWeight: 700, fontSize: '0.8rem' }}>₹{p.price.toLocaleString()}</span>
                                                {p.product_group && (
                                                    <span style={{ padding: '1px 5px', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 700, background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))' }}>
                                                        {p.product_group}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Message Text */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div className="badge badge-delivered" style={{ width: '24px', height: '24px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                    <h3 style={{ margin: 0 }}>Campaign Message</h3>
                                </div>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="e.g. Don't miss out on this year's most beautiful silk saree! Only a few left in stock."
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '12px', background: 'hsl(var(--bg-app))',
                                        border: '1px solid hsl(var(--border-subtle))', color: '#fff', fontSize: '1rem',
                                        minHeight: '100px', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Preview / Send */}
                            <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
                                <h3 style={{ marginBottom: '1.5rem' }}>Campaign Summary</h3>

                                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Audience:</span>
                                        <strong>{customers.length} Customers</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Product:</span>
                                        <strong>{selectedProduct ? selectedProduct.name : 'All Collections'}</strong>
                                    </div>
                                </div>

                                {!sending && !completed && (
                                    <button
                                        onClick={startBroadcast}
                                        disabled={!message}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '1rem', justifyContent: 'center', gap: '0.75rem' }}
                                    >
                                        <Send size={18} /> Send Broadcast Now
                                    </button>
                                )}

                                {sending && (
                                    <div style={{ textAlign: 'center' }}>
                                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(var(--primary))', marginBottom: '1rem' }} />
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sending...</div>
                                        <div className="badge badge-delivered" style={{ padding: '4px 12px' }}>
                                            {stats.sent} / {stats.total} Sent
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'hsl(var(--bg-app))', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
                                            <div style={{ width: `${(stats.sent / stats.total) * 100}%`, height: '100%', background: 'hsl(var(--primary))', transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                )}

                                {completed && (
                                    <div style={{ textAlign: 'center', background: 'hsl(var(--success) / 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid hsl(var(--success) / 0.3)' }}>
                                        <CheckCircle2 size={40} style={{ color: 'hsl(var(--success))', marginBottom: '1rem' }} />
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'hsl(var(--success))' }}>Broadcast Complete!</div>
                                        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>Message sent to {stats.total} customers.</p>
                                        <button
                                            onClick={() => setCompleted(false)}
                                            className="btn btn-secondary"
                                            style={{ marginTop: '1rem', width: '100%' }}
                                        >
                                            New Campaign
                                        </button>
                                    </div>
                                )}

                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border-subtle))', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                    ⚠️ Please note: Rapid bulk messaging may result in temporary WhatsApp account limitations.
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
