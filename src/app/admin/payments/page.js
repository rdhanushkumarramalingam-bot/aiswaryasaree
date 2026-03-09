'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    CreditCard, Search, Filter, RefreshCw, Loader2,
    CheckCircle, XCircle, Clock, IndianRupee, TrendingUp,
    Download, Eye, Smartphone, Globe, ChevronDown
} from 'lucide-react';

const STATUS_COLORS = {
    PAID: { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.3)', label: 'Paid' },
    PENDING: { bg: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', border: 'hsl(var(--accent) / 0.3)', label: 'Pending' },
    FAILED: { bg: 'hsl(var(--danger) / 0.12)', color: 'hsl(var(--danger))', border: 'hsl(var(--danger) / 0.3)', label: 'Failed' },
    PLACED: { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.3)', label: 'Placed' },
    CANCELLED: { bg: 'hsl(var(--danger) / 0.12)', color: 'hsl(var(--danger))', border: 'hsl(var(--danger) / 0.3)', label: 'Cancelled' },
};

const METHOD_ICONS = {
    Razorpay: { color: '#3395FF', label: 'Razorpay', icon: '💳' },
    PhonePe: { color: '#5e17eb', label: 'PhonePe', icon: '📱' },
    UPI: { color: '#00b300', label: 'UPI', icon: '📲' },
    COD: { color: '#f59e0b', label: 'COD', icon: '💵' },
    WhatsApp: { color: '#25d366', label: 'WhatsApp', icon: '💬' },
};

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 });

    const fetchPayments = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select('id, customer_name, customer_phone, total_amount, status, payment_method, created_at, razorpay_payment_id, phonepe_transaction_id, shipping_address, order_items(*)')
                .order('created_at', { ascending: false });

            // Date filter
            if (dateFilter === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                query = query.gte('created_at', today.toISOString());
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', weekAgo.toISOString());
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', monthAgo.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            const list = data || [];
            setPayments(list);

            // Compute stats
            const paid = list.filter(o => o.status === 'PAID' || o.status === 'PLACED');
            const pending = list.filter(o => o.status === 'PENDING');
            const failed = list.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED');
            const revenue = paid.reduce((s, o) => s + (o.total_amount || 0), 0);
            setStats({ total: list.length, paid: paid.length, pending: pending.length, failed: failed.length, revenue });

        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPayments(); }, [dateFilter]);

    const filtered = payments.filter(p => {
        const matchSearch = !search || [p.customer_name, p.customer_phone, p.id, p.razorpay_payment_id, p.phonepe_transaction_id]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
        const matchMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;
        return matchSearch && matchStatus && matchMethod;
    });

    const exportCSV = () => {
        const rows = [['Order ID', 'Customer', 'Phone', 'Amount', 'Status', 'Method', 'Date', 'Transaction ID']];
        filtered.forEach(p => rows.push([
            p.id, p.customer_name, p.customer_phone,
            p.total_amount, p.status, p.payment_method || 'N/A',
            new Date(p.created_at).toLocaleDateString('en-IN'),
            p.razorpay_payment_id || p.phonepe_transaction_id || 'N/A'
        ]));
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `payments_${Date.now()}.csv`; a.click();
    };

    const statCards = [
        { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: 'var(--primary)', bg: 'hsl(var(--primary) / 0.12)' },
        { label: 'Paid Orders', value: stats.paid, icon: CheckCircle, color: 'hsl(var(--success))', bg: 'hsl(var(--success) / 0.12)' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: 'hsl(var(--accent))', bg: 'hsl(var(--accent) / 0.12)' },
        { label: 'Failed / Cancelled', value: stats.failed, icon: XCircle, color: 'hsl(var(--danger))', bg: 'hsl(var(--danger) / 0.12)' },
    ];

    const sStyle = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' };

    return (
        <div className="animate-enter" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                        <CreditCard size={30} color="hsl(var(--primary))" />
                        Payments
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                        All transactions — Razorpay, PhonePe, COD & WhatsApp orders
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={fetchPayments} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                        <RefreshCw size={15} /> Refresh
                    </button>
                    <button onClick={exportCSV} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {statCards.map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={22} color={s.color} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '2 1 220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input
                        placeholder="Search by name, phone, order ID, txn ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="admin-input"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                {/* Status */}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 120px' }}>
                    <option value="ALL">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PLACED">Placed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                {/* Method */}
                <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 130px' }}>
                    <option value="ALL">All Methods</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="UPI">UPI</option>
                    <option value="COD">COD</option>
                    <option value="WhatsApp">WhatsApp</option>
                </select>
                {/* Date Range */}
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 120px' }}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                </select>
            </div>

            {/* Payments Table */}
            <div className="card shadow-premium" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                        <Loader2 size={36} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 1rem' }} />
                        <p style={{ color: 'hsl(var(--text-muted))' }}>Loading payments...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                        <CreditCard size={48} style={{ color: 'hsl(var(--text-muted))', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
                        <p style={{ color: 'hsl(var(--text-muted))' }}>No payments found</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'hsl(var(--bg-panel) / 0.8)' }}>
                                <tr>
                                    {['Order', 'Customer', 'Amount', 'Status', 'Method', 'Transaction ID', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-muted))', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, idx) => {
                                    const statusMeta = STATUS_COLORS[p.status] || STATUS_COLORS.PENDING;
                                    const methodMeta = METHOD_ICONS[p.payment_method] || { color: '#888', label: p.payment_method || 'N/A', icon: '💳' };
                                    const txnId = p.razorpay_payment_id || p.phonepe_transaction_id || '-';

                                    return (
                                        <tr key={p.id}
                                            style={{ borderBottom: '1px solid hsl(var(--border-subtle))', transition: 'background 0.15s', cursor: 'default' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--bg-panel) / 0.4)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Order ID */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <code style={{ background: 'hsl(var(--bg-app))', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.8rem', color: 'hsl(var(--primary))' }}>
                                                    #{String(p.id).slice(0, 8)}
                                                </code>
                                            </td>

                                            {/* Customer */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--text-main))' }}>{p.customer_name || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.customer_phone}</div>
                                            </td>

                                            {/* Amount */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>₹{p.total_amount?.toLocaleString()}</span>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <span style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, padding: '0.3rem 0.8rem', borderRadius: 30, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                                    {statusMeta.label}
                                                </span>
                                            </td>

                                            {/* Method */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span>{methodMeta.icon}</span>
                                                    <span style={{ color: methodMeta.color, fontWeight: 700, fontSize: '0.82rem' }}>{methodMeta.label}</span>
                                                </div>
                                            </td>

                                            {/* Transaction ID */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <code style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', background: 'hsl(var(--bg-app))', padding: '0.2rem 0.4rem', borderRadius: 5 }}>
                                                    {txnId.length > 16 ? txnId.slice(0, 16) + '...' : txnId}
                                                </code>
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '1rem 1.25rem', color: 'hsl(var(--text-muted))', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <div style={{ fontSize: '0.7rem' }}>{new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <button
                                                    onClick={() => setSelectedPayment(p)}
                                                    className="btn-icon primary"
                                                    title="View Details"
                                                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid hsl(var(--border-subtle))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer count */}
                {!loading && filtered.length > 0 && (
                    <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        <span>Showing <strong style={{ color: 'hsl(var(--text-main))' }}>{filtered.length}</strong> of {payments.length} transactions</span>
                        <span>Total filtered: <strong style={{ color: 'hsl(var(--primary))' }}>₹{filtered.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString()}</strong></span>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedPayment && (
                <div onClick={() => setSelectedPayment(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'hsl(var(--bg-card))', borderRadius: 24, padding: '2rem', maxWidth: 480, width: '100%', border: '1px solid hsl(var(--border-subtle))', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Payment Details</h3>
                            <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
                        </div>

                        {[
                            ['Order ID', `#${selectedPayment.id}`],
                            ['Customer', selectedPayment.customer_name],
                            ['Phone', selectedPayment.customer_phone],
                            ['Amount', `₹${selectedPayment.total_amount?.toLocaleString()}`],
                            ['Status', selectedPayment.status],
                            ['Payment Method', selectedPayment.payment_method || 'N/A'],
                            ['Razorpay ID', selectedPayment.razorpay_payment_id || '-'],
                            ['PhonePe Txn ID', selectedPayment.phonepe_transaction_id || '-'],
                            ['Date', new Date(selectedPayment.created_at).toLocaleString('en-IN')],
                            ['Shipping Address', selectedPayment.shipping_address || 'N/A'],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{label}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                            </div>
                        ))}

                        {selectedPayment.order_items?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Items Ordered</p>
                                {selectedPayment.order_items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                                        <span>{item.product_name} ×{item.quantity}</span>
                                        <span style={{ fontWeight: 700 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .shadow-premium { box-shadow: 0 20px 60px -15px rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
}
