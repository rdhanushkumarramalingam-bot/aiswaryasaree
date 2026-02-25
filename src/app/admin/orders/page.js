'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Search, Filter, Eye, Truck, Check, X, ChevronDown,
    Loader2, MessageCircle, MapPin, Phone, Calendar, Package,
    RefreshCw, Download
} from 'lucide-react';

const STATUS_OPTIONS = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SOURCE_FILTERS = ['ALL', 'WEBSITE', 'WHATSAPP'];

const getStatusReference = (status) => {
    switch (status) {
        case 'PLACED': return 'badge-placed';
        case 'PENDING': return 'badge-placed';
        case 'PAID': return 'badge-paid';
        case 'SHIPPED': return 'badge-shipped';
        case 'DELIVERED': return 'badge-delivered';
        case 'CANCELLED': return 'badge-cancelled';
        default: return 'badge';
    }
};

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select('*')
                .neq('status', 'DRAFT')
                .order('created_at', { ascending: false });

            const { data } = await query;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchOrders();
        const channel = supabase
            .channel('orders_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    if (!hasMounted) {
        return (
            <div className="animate-enter" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
                <p>Initializing orders portal...</p>
            </div>
        );
    }

    const openOrderDetail = async (order) => {
        setSelectedOrder(order);
        const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
        setOrderItems(data || []);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus })
            });

            const data = await res.json();
            if (res.ok) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                fetchOrders();
                setNotification({
                    message: `✅ Order updated to ${newStatus}`,
                    type: 'success'
                });
            } else {
                setNotification({ message: `❌ Failed: ${data.error}`, type: 'error' });
            }
        } catch (error) {
            setNotification({ message: '❌ Error updating status', type: 'error' });
        }
        setTimeout(() => setNotification(null), 4000);
    };

    const filteredOrders = orders.filter(o => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (o.id || '').toLowerCase().includes(term) ||
            (o.customer_name || '').toLowerCase().includes(term) ||
            (o.customer_phone || '').toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        const orderSource = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
        const matchesSource = sourceFilter === 'ALL' || orderSource === sourceFilter;
        return matchesSearch && matchesStatus && matchesSource;
    });

    const orderCounts = {
        ALL: orders.length,
        PLACED: orders.filter(o => o.status === 'PLACED').length,
        PAID: orders.filter(o => o.status === 'PAID').length,
        SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
        DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,
    };

    return (
        <div className="animate-enter">
            {loading ? (
                <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
                    <p>Loading orders collection...</p>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="admin-header-row">
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Orders</h1>
                            <p>Manage and track all customer orders • {orders.length} total</p>
                        </div>
                        <button onClick={fetchOrders} className="btn btn-secondary">
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>

                    {/* Status Tabs */}
                    <div className="admin-filter-row">
                        {Object.entries(orderCounts).map(([status, count]) => (
                            <button key={status} onClick={() => setStatusFilter(status)} style={{
                                padding: '0.6rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem',
                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                background: statusFilter === status ? 'hsl(var(--primary))' : 'hsl(var(--bg-card))',
                                color: statusFilter === status ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                border: statusFilter === status ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                boxShadow: statusFilter === status ? '0 4px 12px hsl(var(--primary) / 0.3)' : 'none'
                            }}>
                                {status === 'ALL' ? 'All Orders' : status} <span style={{ opacity: 0.7, marginLeft: '4px' }}>({count})</span>
                            </button>
                        ))}
                    </div>

                    {/* Source Filter */}
                    <div className="admin-filter-row" style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Channel:</span>
                        {SOURCE_FILTERS.map(src => (
                            <button key={src} onClick={() => setSourceFilter(src)} style={{
                                padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.8rem',
                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                background: sourceFilter === src
                                    ? src === 'WEBSITE' ? 'hsl(195 85% 40%)' : src === 'WHATSAPP' ? '#25D366' : 'hsl(var(--bg-panel))'
                                    : 'hsl(var(--bg-card))',
                                color: sourceFilter === src ? '#fff' : 'hsl(var(--text-muted))',
                                border: '1px solid hsl(var(--border-subtle))'
                            }}>
                                {src === 'ALL' ? '🌐 All' : src === 'WEBSITE' ? '🌐 Website' : '💬 WhatsApp'}
                            </button>
                        ))}
                    </div>

                    {/* Search + Table Card */}
                    <div className="card" style={{ padding: 0 }}>
                        {/* Search Bar */}
                        <div className="admin-search-container">
                            <div className="admin-search-input-wrapper">
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                <input
                                    type="text"
                                    placeholder="Search by Order ID, Name or Phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
                                        background: 'hsl(var(--bg-app))',
                                        border: '1px solid hsl(var(--border-subtle))',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',
                                        color: 'hsl(var(--text-main))', fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                            </div>
                        ) : (
                            <table style={{ margin: 0 }}>
                                <thead style={{ background: 'hsl(var(--bg-panel))' }}>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th style={{ textAlign: 'center' }}>Source</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th style={{ textAlign: 'center' }}>Payment</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'left' }}>Date</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders found.</td></tr>
                                    ) : (
                                        filteredOrders.map(order => {
                                            const src = order.source || (order.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
                                            return (
                                                <tr key={order.id} onClick={() => openOrderDetail(order)} style={{ cursor: 'pointer' }}>
                                                    <td style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>#{order.id}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'Guest'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{order.customer_phone}</div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                            padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                                            background: src === 'WEBSITE' ? 'hsl(195 85% 40% / 0.15)' : 'rgba(37,211,102,0.12)',
                                                            color: src === 'WEBSITE' ? 'hsl(195 85% 55%)' : '#25D366',
                                                            border: src === 'WEBSITE' ? '1px solid hsl(195 85% 40% / 0.3)' : '1px solid rgba(37,211,102,0.3)'
                                                        }}>
                                                            {src === 'WEBSITE' ? '🌐' : '💬'} {src === 'WEBSITE' ? 'Web' : 'WhatsApp'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'hsl(var(--text-main))' }}>₹{(order.total_amount || 0).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{order.payment_method || '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${getStatusReference(order.status)}`}>{order.status}</span>
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ────── ORDER DETAIL MODAL ────── */}
                    {selectedOrder && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', zIndex: 1000
                        }} onClick={() => setSelectedOrder(null)}>
                            <div onClick={(e) => e.stopPropagation()} className="card" style={{
                                width: '650px', maxHeight: '90vh', overflow: 'auto', padding: 0,
                                border: '1px solid hsl(var(--primary) / 0.3)',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                            }}>
                                {/* Modal Header */}
                                <div style={{
                                    padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'hsl(var(--bg-panel))'
                                }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Order #{selectedOrder.id}</h2>
                                        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                                            Placed on {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} style={{ color: 'hsl(var(--text-muted))', padding: '0.5rem' }}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div style={{ padding: '2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>Customer Details</h4>
                                            <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))', marginBottom: '0.25rem' }}>{selectedOrder.customer_name || 'Guest'}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Phone size={14} /> {selectedOrder.customer_phone}
                                            </div>
                                            <a href={`https://wa.me/${selectedOrder.customer_phone}`} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: '#25D366', fontWeight: 600, fontSize: '0.85rem' }}>
                                                <MessageCircle size={16} /> Chat on WhatsApp
                                            </a>
                                        </div>
                                        <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>Payment & Billing</h4>
                                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-main))', marginBottom: '0.25rem' }}>
                                                Method: <span style={{ fontWeight: 600 }}>{selectedOrder.payment_method || 'Pending'}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-main))', marginBottom: '0.5rem' }}>
                                                Source: <span style={{ fontWeight: 600 }}>{selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? '🌐 Website' : '💬 WhatsApp')}</span>
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                                                ₹{(selectedOrder.total_amount || 0).toLocaleString()}
                                            </div>
                                            {selectedOrder.invoice_url && (
                                                <a href={selectedOrder.invoice_url} target="_blank" rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'hsl(var(--info))', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    <Download size={16} /> Download Invoice
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {selectedOrder.delivery_address && (
                                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={12} /> Delivery Address
                                            </h4>
                                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-main))', lineHeight: 1.5 }}>{selectedOrder.delivery_address}</div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem' }}>Order Items</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {orderItems.map((item, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{item.quantity} x ₹{(item.price_at_time || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{ fontWeight: 600 }}>₹{((item.price_at_time || 0) * item.quantity).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Update Status</h4>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {STATUS_OPTIONS.map(status => {
                                                const isActive = selectedOrder.status === status;
                                                return (
                                                    <button key={status} onClick={() => updateOrderStatus(selectedOrder.id, status)}
                                                        className={`badge ${getStatusReference(status)}`}
                                                        style={{
                                                            cursor: 'pointer', opacity: isActive ? 1 : 0.5,
                                                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                                            transition: 'all 0.2s', border: '1px solid currentColor'
                                                        }}>
                                                        {isActive && '✓ '} {status}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification */}
                    {notification && (
                        <div style={{
                            position: 'fixed', top: '2rem', right: '2rem', zIndex: 2000,
                            padding: '1rem 1.5rem', borderRadius: 'var(--radius)',
                            background: notification.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                            color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            animation: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}>
                            {notification.message}
                        </div>
                    )}

                </>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
