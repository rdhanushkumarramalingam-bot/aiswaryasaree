'use client';



import React, { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

import {
    Search, Eye, ChevronDown,
    Loader2, MessageCircle, Truck, RefreshCw
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
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [shippingForm, setShippingForm] = useState({
        courier_name: '',
        tracking_number: '',
        tracking_url: ''
    });



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
        setOrderItems([]); // Clear previous items to avoid flickering
        const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
        setOrderItems(data || []);
    };



    const sendWhatsAppNotification = (order, newStatus, shippingData = {}) => {
        if (!order || !order.customer_phone) return;

        const phone = order.customer_phone.replace(/\D/g, '');
        // NOOP — We now rely on the automated bot notification from the backend.
        // This avoids browser 'popup blocked' issues during async status updates.
    };

    const updateOrderStatus = async (orderId, newStatus, shippingData = {}) => {
        try {
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus, ...shippingData })
            });

            const data = await res.json();
            if (res.ok) {
                // Map camelCase from shippingData back to snake_case for the UI state
                const mappedShipping = {};
                if (shippingData.courierName) mappedShipping.courier_name = shippingData.courierName;
                if (shippingData.trackingNumber) mappedShipping.tracking_number = shippingData.trackingNumber;
                if (shippingData.trackingUrl) mappedShipping.tracking_url = shippingData.trackingUrl;

                setSelectedOrder(prev => prev ? {
                    ...prev,
                    status: newStatus,
                    ...mappedShipping
                } : null);

                fetchOrders();
                setNotification({
                    message: `✅ Order updated to ${newStatus}`,
                    type: 'success'
                });

                // NO MANUAL WHATSAPP TRIGGER — The backend API /api/orders/update-status 
                // already sends the official notification via the WhatsApp Business API.
            } else {
                setNotification({ message: `❌ Failed: ${data.error}`, type: 'error' });
            }
        } catch (error) {
            setNotification({ message: '❌ Error updating status', type: 'error' });
        }
        setTimeout(() => setNotification(null), 4000);
    };

    const handleUpdateItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;
        setOrderItems(newItems);
    };

    const handleRemoveItem = (index) => {
        const newItems = orderItems.filter((_, i) => i !== index);
        setOrderItems(newItems);
    };

    const saveOrderEdits = async () => {
        try {
            setLoading(true);
            const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price_at_time), 0);

            // Calculate taxes based on selectedOrder's state
            const state = selectedOrder.shipping_state || 'Tamil Nadu';
            const gstRate = 0.05; // 5%
            const tax = subtotal * gstRate;
            const shipping = selectedOrder.shipping_cost || 100;
            const total = subtotal + tax + shipping;

            let taxDetails = {};
            if (state === 'Tamil Nadu') {
                taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
            } else {
                taxDetails = { cgst: 0, sgst: 0, igst: tax };
            }

            // 1. Update Order record
            const { error: orderError } = await supabase.from('orders').update({
                subtotal,
                tax_amount: tax,
                total_amount: total,
                ...taxDetails
            }).eq('id', selectedOrder.id);

            if (orderError) throw orderError;

            // 2. Refresh Items (simplest: delete all and re-insert)
            await supabase.from('order_items').delete().eq('order_id', selectedOrder.id);
            const { error: itemsError } = await supabase.from('order_items').insert(
                orderItems.map(item => ({
                    order_id: selectedOrder.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price_at_time: item.price_at_time,
                    variant_id: item.variant_id,
                    variant_name: item.variant_name
                }))
            );

            if (itemsError) throw itemsError;

            setNotification({ message: '✅ Order items updated and totals recalculated', type: 'success' });
            setIsEditingItems(false);
            fetchOrders();
            // Refresh local selectedOrder
            const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', selectedOrder.id).single();
            setSelectedOrder(updatedOrder);

        } catch (error) {
            console.error(error);
            setNotification({ message: '❌ Failed to save edits', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
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
                                        <th style={{ textAlign: 'left' }}>Region</th>
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
                                        <tr><td colSpan={10} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders found matching your criteria.</td></tr>
                                    ) : (
                                        filteredOrders.map(order => {
                                            const src = order.source || (order.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
                                            const isExpanded = selectedOrder?.id === order.id;

                                            return (
                                                <React.Fragment key={order.id}>
                                                    <tr
                                                        onClick={() => isExpanded ? (setSelectedOrder(null), setOrderItems([])) : openOrderDetail(order)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            background: isExpanded ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                                                            transition: 'background 0.2s'
                                                        }}
                                                    >
                                                        <td style={{ fontWeight: 600, color: isExpanded ? 'hsl(var(--primary))' : 'inherit' }}>#{order.id}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'Guest'}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{order.customer_phone}</div>
                                                        </td>
                                                        <td style={{ textAlign: 'left' }}>
                                                            <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{order.shipping_state || '—'}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>India</div>
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
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                                {isExpanded ? <ChevronDown size={18} color="hsl(var(--primary))" /> : <Eye size={18} />}
                                                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                                    {isExpanded ? 'Hide' : 'View'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* INLINE DETAIL VIEW — ONLY FOR EXPANDED ROW */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={10} style={{ padding: '0', background: 'hsl(var(--bg-app) / 0.3)' }}>
                                                                <div className="animate-expand" style={{ padding: '2rem', borderLeft: '4px solid hsl(var(--primary))', margin: '1rem' }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

                                                                        {/* Left: Customer & Logistics */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                                            <div className="card-sub" style={{ padding: '1.25rem', background: 'hsl(var(--bg-panel))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', letterSpacing: '0.05em' }}>📍 Delivery Details</h4>
                                                                                <div style={{ fontSize: '0.95rem', color: 'hsl(var(--text-main))', fontWeight: 600 }}>{order.customer_name}</div>
                                                                                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: '0.25rem 0 1rem' }}>{order.customer_phone}</div>
                                                                                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'hsl(var(--text-muted))', margin: 0 }}>
                                                                                    {order.delivery_address}
                                                                                </p>
                                                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                                                                    <a href={`https://wa.me/${order.customer_phone}`} className="btn-wa-link">
                                                                                        <MessageCircle size={16} /> WhatsApp Message
                                                                                    </a>
                                                                                </div>
                                                                            </div>

                                                                            <div className="card-sub" style={{ padding: '1.25rem', background: 'hsl(var(--bg-panel))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>🚚 Logistics Status</h4>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                                                    <div>
                                                                                        <label style={{ fontSize: '0.7rem', display: 'block', color: 'hsl(var(--text-muted))' }}>Current Status</label>
                                                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                                                            {STATUS_OPTIONS.map(s => (
                                                                                                <button
                                                                                                    key={s}
                                                                                                    onClick={(e) => { e.stopPropagation(); s === 'SHIPPED' ? setShowShippingModal(true) : updateOrderStatus(order.id, s); }}
                                                                                                    className={`badge-btn ${order.status === s ? getStatusReference(s) : 'badge-inactive'}`}
                                                                                                >
                                                                                                    {s}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    {order.status === 'SHIPPED' && (
                                                                                        <div style={{ padding: '1rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '8px', border: '1px dashed hsl(var(--primary) / 0.3)' }}>
                                                                                            <div style={{ fontSize: '0.8rem' }}><strong>Carrier:</strong> {order.courier_name || 'N/A'}</div>
                                                                                            <div style={{ fontSize: '0.8rem' }}><strong>Tracking:</strong> {order.tracking_number || 'N/A'}</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right: Items & Bill */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                                            <div className="card-sub" style={{ padding: '1.25rem', background: 'hsl(var(--bg-panel))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                                                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: 0 }}>🛍️ Order Contents</h4>
                                                                                    <button onClick={() => setIsEditingItems(!isEditingItems)} style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                                                                                        {isEditingItems ? 'DONE EDITING' : 'EDIT ITEMS'}
                                                                                    </button>
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                                    {orderItems.map((item, idx) => (
                                                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)', paddingBottom: '0.5rem' }}>
                                                                                            <div>
                                                                                                <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                                                                                                {isEditingItems ? (
                                                                                                    <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                                                                        <input type="number" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))} style={{ width: '40px', background: 'none', border: '1px solid gray', color: 'white' }} /> x ₹
                                                                                                        <input type="number" value={item.price_at_time} onChange={e => handleUpdateItem(idx, 'price_at_time', parseInt(e.target.value))} style={{ width: '80px', background: 'none', border: '1px solid gray', color: 'white' }} />
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{item.quantity} x ₹{item.price_at_time.toLocaleString()}</div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div style={{ fontWeight: 700 }}>₹{(item.quantity * item.price_at_time).toLocaleString()}</div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {isEditingItems && (
                                                                                    <button onClick={saveOrderEdits} className="btn-save-sm">Recalculate & Save</button>
                                                                                )}

                                                                                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                                        <span>Subtotal:</span>
                                                                                        <span>₹{(order.total_amount - (order.cgst || 0) - (order.sgst || 0) - (order.igst || 0) - (order.shipping_charge || 0)).toLocaleString()}</span>
                                                                                    </div>
                                                                                    {order.cgst > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                                                            <span>CGST (9%):</span>
                                                                                            <span>₹{order.cgst.toLocaleString()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {order.sgst > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                                                            <span>SGST (9%):</span>
                                                                                            <span>₹{order.sgst.toLocaleString()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {order.igst > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                                                            <span>IGST (18%):</span>
                                                                                            <span>₹{order.igst.toLocaleString()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                                        <span>Shipping Fee:</span>
                                                                                        <span>₹{(order.shipping_charge || 0).toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.4rem 0' }} />
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                                                                        <span>BILL TOTAL:</span>
                                                                                        <span>₹{order.total_amount.toLocaleString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}

                                </tbody>

                            </table>

                        )}

                    </div>



                    {/* ORDER DETAIL MODAL REMOVED FOR INLINE EXPANSION */}

                    {/* ────── SHIPPING DETAILS MODAL (ONLY FOR SHIPPED STATUS) ────── */}
                    {showShippingModal && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)', zIndex: 1100,
                            display: 'grid', placeItems: 'center', padding: '1rem'
                        }} onClick={() => setShowShippingModal(false)}>
                            <div onClick={(e) => e.stopPropagation()} className="card animate-enter" style={{
                                width: '100%', maxWidth: '400px', padding: '2rem',
                                border: '1px solid hsl(var(--primary) / 0.4)',
                                backgroundColor: 'hsl(var(--bg-card))',
                                boxShadow: '0 0 40px hsl(var(--primary) / 0.15)'
                            }}>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 1rem'
                                    }}>
                                        <Truck size={30} />
                                    </div>
                                    <h2 style={{ fontSize: '1.25rem' }}>Update Shipping Details</h2>
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Enter tracking info for Order #{selectedOrder.id}</p>
                                </div>

                                <div style={{ display: 'grid', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Courier Name</label>
                                        <input
                                            type="text"
                                            value={shippingForm.courier_name}
                                            onChange={e => setShippingForm({ ...shippingForm, courier_name: e.target.value })}
                                            placeholder="e.g. Blue Dart, Delhivery"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel))', color: 'white', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Tracking Number</label>
                                        <input
                                            type="text"
                                            value={shippingForm.tracking_number}
                                            onChange={e => setShippingForm({ ...shippingForm, tracking_number: e.target.value })}
                                            placeholder="e.g. 12345678"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel))', color: 'white', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Tracking URL</label>
                                        <input
                                            type="text"
                                            value={shippingForm.tracking_url}
                                            onChange={e => setShippingForm({ ...shippingForm, tracking_url: e.target.value })}
                                            placeholder="https://tracker.link/..."
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel))', color: 'white', outline: 'none' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button onClick={() => setShowShippingModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'SHIPPED', {
                                                    courierName: shippingForm.courier_name,
                                                    trackingNumber: shippingForm.tracking_number,
                                                    trackingUrl: shippingForm.tracking_url
                                                });
                                                setShowShippingModal(false);
                                            }}
                                            disabled={!shippingForm.courier_name || !shippingForm.tracking_number}
                                            className="btn btn-primary"
                                            style={{ flex: 2 }}
                                        >
                                            Continue & Notify
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                        Marking as shipped will automatically send tracking details to the customer via WhatsApp.
                                    </p>
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
                @keyframes expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
                .animate-expand { animation: expand 0.4s ease-out; overflow: hidden; }
                .card-sub { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .btn-wa-link { 
                    display: inline-flex; align-items: center; gap: 0.5rem; 
                    padding: 0.6rem 1rem; background: #25D36615; color: #25D366; 
                    border: 1px solid #25D36630; border-radius: 8px; font-weight: 700; 
                    font-size: 0.85rem; text-decoration: none; transition: 0.2s;
                }
                .btn-wa-link:hover { background: #25D36625; transform: translateY(-1px); }
                .badge-btn { 
                    padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.75rem; 
                    font-weight: 700; cursor: pointer; border: none; transition: 0.2s;
                    margin-right: 0.5rem; margin-bottom: 0.5rem;
                }
                .badge-inactive { background: hsl(var(--bg-app)); color: hsl(var(--text-muted)); border: 1px solid hsl(var(--border-subtle)); }
                .btn-save-sm { 
                    width: 100%; margin-top: 1rem; padding: 0.6rem; 
                    background: hsl(var(--primary)); color: white; border: none; 
                    border-radius: 8px; font-weight: 700; cursor: pointer;
                }
                @media (max-width: 768px) {
                    .admin-header-row { flex-direction: column; align-items: stretch !important; gap: 1rem; }
                    .admin-filter-row { overflow-x: auto; white-space: nowrap; padding-bottom: 0.5rem; }
                    .admin-filter-row::-webkit-scrollbar { display: none; }
                    .card { overflow: visible !important; }
                    table { min-width: 800px; }
                }
            `}</style>
        </div>
    );
}

