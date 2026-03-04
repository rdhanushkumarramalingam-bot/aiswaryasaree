'use client';



import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

import { Search, Loader2, FileText, Download, Eye, Printer, MessageCircle, Settings, Save, Image, MapPin, Hash, Info, X, CheckCircle2 } from 'lucide-react';



export default function InvoicesPage() {

    const [invoices, setInvoices] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');

    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const [invoiceItems, setInvoiceItems] = useState([]);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [settings, setSettings] = useState({
        shop_name: 'Cast Prince',
        shop_logo: '',
        shop_address: '',
        shop_gstin: '',
        bill_terms: '',
        bill_footer: 'Thank you for shopping with us!',
        business_phone: '917558189732'
    });
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);



    useEffect(() => {

        const fetchInvoices = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('*')
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false });
                setInvoices(data || []);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const { data } = await supabase.from('app_settings').select('*');
                if (data) {
                    const mapped = {};
                    data.forEach(item => mapped[item.key] = item.value);
                    setSettings(prev => ({ ...prev, ...mapped }));
                }
            } catch (err) {
                console.error('Settings load error:', err);
            }
        };

        fetchInvoices();
        fetchSettings();
    }, []);

    const saveSettings = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'shop_name', value: settings.shop_name },
                { key: 'shop_logo', value: settings.shop_logo },
                { key: 'shop_address', value: settings.shop_address },
                { key: 'shop_gstin', value: settings.shop_gstin },
                { key: 'bill_terms', value: settings.bill_terms },
                { key: 'bill_footer', value: settings.bill_footer },
                { key: 'business_phone', value: settings.business_phone }
            ];
            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;
            setIsConfiguring(false);
            setNotification({ message: 'Invoice settings updated!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };



    const openInvoice = async (order) => {

        setSelectedInvoice(order);

        const { data } = await supabase

            .from('order_items')

            .select('*')

            .eq('order_id', order.id);

        setInvoiceItems(data || []);

    };



    const printInvoice = () => {

        window.print();

    };



    const getStatusReference = (status) => {

        switch (status) {

            case 'PAID': case 'DELIVERED': return 'badge-delivered';

            case 'PLACED': case 'PENDING': return 'badge-placed';

            default: return 'badge';

        }

    };



    const filteredInvoices = invoices.filter(inv =>

        inv.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||

        inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        inv.customer_phone?.includes(searchTerm)

    );



    const totalRevenue = invoices.reduce((s, o) => s + (o.total_amount || 0), 0);

    const paidInvoices = invoices.filter(o => ['PAID', 'DELIVERED', 'SHIPPED'].includes(o.status));

    const paidTotal = paidInvoices.reduce((s, o) => s + (o.total_amount || 0), 0);

    const unpaidTotal = totalRevenue - paidTotal;



    if (loading) {

        return (

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '0.75rem', color: 'hsl(var(--text-muted))' }}>

                <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading Invoices...

            </div>

        );

    }



    return (

        <div className="animate-enter">

            {/* Header */}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Invoices</h1>
                    <p>All WhatsApp order invoices • {invoices.length} total</p>
                </div>
                <button
                    onClick={() => setIsConfiguring(true)}
                    className="btn btn-secondary"
                    style={{ background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-subtle))', padding: '0.75rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}
                >
                    <Settings size={18} /> Customize Template
                </button>
            </div>

            {notification && (
                <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 1100, background: 'hsl(142 70% 45%)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <CheckCircle2 size={20} /> {notification.message}
                </div>
            )}



            {/* Revenue Cards */}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>

                <div className="card" style={{ padding: '1.5rem' }}>

                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Billed</div>

                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>₹{totalRevenue.toLocaleString()}</div>

                </div>

                <div className="card" style={{ padding: '1.5rem' }}>

                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--success))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</div>

                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--success))', fontFamily: 'var(--font-heading)' }}>₹{paidTotal.toLocaleString()}</div>

                </div>

                <div className="card" style={{ padding: '1.5rem' }}>

                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--warning))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unpaid (COD)</div>

                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--warning))', fontFamily: 'var(--font-heading)' }}>₹{unpaidTotal.toLocaleString()}</div>

                </div>

            </div>



            {/* Invoice List */}

            <div className="card" style={{ padding: 0 }}>

                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))' }}>

                    <div style={{ position: 'relative', maxWidth: '400px' }}>

                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />

                        <input

                            type="text" placeholder="Search invoices..."

                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}

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



                <table style={{ margin: 0 }}>

                    <thead style={{ background: 'hsl(var(--bg-panel))' }}>

                        <tr>

                            <th>Invoice #</th>

                            <th>Customer</th>

                            <th style={{ textAlign: 'right' }}>Amount</th>

                            <th style={{ textAlign: 'center' }}>Payment</th>

                            <th style={{ textAlign: 'center' }}>Status</th>

                            <th style={{ textAlign: 'left' }}>Date</th>

                            <th style={{ textAlign: 'right' }}>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredInvoices.length === 0 ? (

                            <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No invoices found.</td></tr>

                        ) : (

                            filteredInvoices.map(inv => (

                                <tr key={inv.id}>

                                    <td style={{ padding: '1rem 1.5rem' }}>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                            <FileText size={16} style={{ color: 'hsl(var(--primary))' }} />

                                            <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>INV-{inv.id}</span>

                                        </div>

                                    </td>

                                    <td>

                                        <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{inv.customer_name || 'WhatsApp Customer'}</div>

                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{inv.customer_phone}</div>

                                    </td>

                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{(inv.total_amount || 0).toLocaleString()}</td>

                                    <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{inv.payment_method || '—'}</td>

                                    <td style={{ textAlign: 'center' }}>

                                        <span className={`badge ${getStatusReference(inv.status)}`}>{inv.status}</span>

                                    </td>

                                    <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>

                                        {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

                                    </td>

                                    <td style={{ textAlign: 'right' }}>

                                        <button onClick={() => openInvoice(inv)}

                                            className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>

                                            <Eye size={14} /> View

                                        </button>

                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>



            {/* ────── CONFIGURATION MODAL ────── */}
            {isConfiguring && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1.5rem' }}>
                    <div className="card shadow-premium animate-enter" style={{ width: '100%', maxWidth: '1200px', maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--primary) / 0.3)', borderRadius: '24px' }}>
                        <div style={{ padding: '1.25rem 2rem', background: 'hsl(var(--bg-panel))', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', background: 'hsl(var(--primary)/0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Printer size={20} color="hsl(var(--primary))" />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Invoice Template Designer</h2>
                            </div>
                            <button onClick={() => setIsConfiguring(false)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                            {/* LEFT: SETTINGS EDITOR */}
                            <div style={{ width: '450px', overflowY: 'auto', padding: '2rem', borderRight: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel)/0.3)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Shop Branding Name</label>
                                        <input type="text" value={settings.shop_name} onChange={e => setSettings({ ...settings, shop_name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white' }} />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Logo Image URL</label>
                                        <input type="text" value={settings.shop_logo} onChange={e => setSettings({ ...settings, shop_logo: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white' }} />
                                        <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '0.4rem' }}>Best results with transparent PNG (height: 100px).</p>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Store Physical Address</label>
                                        <textarea rows={3} value={settings.shop_address} onChange={e => setSettings({ ...settings, shop_address: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white', resize: 'none' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>GSTIN Number</label>
                                            <input type="text" value={settings.shop_gstin} onChange={e => setSettings({ ...settings, shop_gstin: e.target.value })} placeholder="Optional" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>WhatsApp Contact</label>
                                            <input type="text" value={settings.business_phone} onChange={e => setSettings({ ...settings, business_phone: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white' }} />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Personalized Footer Greeting</label>
                                        <input type="text" value={settings.bill_footer} onChange={e => setSettings({ ...settings, bill_footer: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white' }} />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Terms & Conditions (Official)</label>
                                        <textarea rows={5} value={settings.bill_terms} onChange={e => setSettings({ ...settings, bill_terms: e.target.value })} placeholder="One rule per line..." style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'white', lineHeight: 1.5, fontSize: '0.85rem' }} />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: REAL-TIME INVOICE PREVIEW */}
                            <div style={{ flex: 1, background: '#f1f5f9', overflowY: 'auto', padding: '3rem', position: 'relative' }}>
                                <div style={{ position: 'sticky', top: '-1rem', left: 0, background: '#6366f1', color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, width: 'fit-content', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                                    LIVE PREVIEW (REAL BILL SAMPLE)
                                </div>

                                {/* Sample Bill Mockup */}
                                <div style={{
                                    background: 'white', width: '100%', maxWidth: '750px', margin: '0 auto',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '2.5rem',
                                    fontFamily: 'Inter, sans-serif', color: 'black'
                                }}>
                                    {/* Bill Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #6366f1', paddingBottom: '2rem', marginBottom: '2rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                                {settings.shop_logo ? (
                                                    <img src={settings.shop_logo} alt="Logo" style={{ height: '45px', objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ fontSize: '2rem' }}>💮</div>
                                                )}
                                                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#111827' }}>{settings.shop_name}</h1>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, maxWidth: '300px', lineHeight: 1.5 }}>{settings.shop_address || '123 Weave St, Handloom Hub, Chennai, TN'}</p>
                                            {settings.shop_gstin && <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, marginTop: '0.4rem' }}>GSTIN: {settings.shop_gstin}</p>}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', margin: 0 }}>TAX INVOICE</h2>
                                            <p style={{ margin: '0.5rem 0 0', fontWeight: 700, fontSize: '0.9rem' }}>#SAMPLE-8821</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {/* Mock Billing Info */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Customer Details</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ananya Singh</div>
                                            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '0.2rem' }}>+91 98765 43210</div>
                                            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '0.4rem', lineHeight: 1.4 }}>Flat 402, Lotus Apartments,<br />Koramangala, Bangalore 560034</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Order Info</div>
                                            <div style={{ fontSize: '0.85rem' }}>Method: <strong>Cash on Delivery</strong></div>
                                            <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Status: <span style={{ background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>DELIVERED</span></div>
                                        </div>
                                    </div>

                                    {/* Mock Items table */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '2rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Item Description</th>
                                                <th style={{ textAlign: 'center', padding: '0.75rem' }}>Qty</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Price</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Pure Kanchipuram Silk Saree - Emerald Green</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>1</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem' }}>₹12,499</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700 }}>₹12,499</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Handcrafted Silver Waistbelt (Vaddanam)</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>1</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem' }}>₹4,500</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700 }}>₹4,500</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Totals */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem' }}>
                                        <div style={{ width: '250px', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                                <span>Subtotal</span><span>₹16,999</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                                                <span>GST (0%)</span><span>₹0</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', pt: '0.75rem', borderTop: '1px solid #e2e8f0', fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>
                                                <span>Grand Total</span><span>₹16,999</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms & Conditions (Live Preview) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Official Terms</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{settings.bill_terms || '1. Terms not configured yet\n2. Please add your terms in the editor'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4b5563', margin: '0 0 0.25rem 0' }}>{settings.bill_footer}</p>
                                            <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, margin: 0 }}>Support: +{settings.business_phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div style={{ padding: '1.25rem 2rem', background: 'hsl(var(--bg-panel))', borderTop: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setIsConfiguring(false)} className="btn btn-secondary" style={{ borderRadius: '10px' }}>Discard Changes</button>
                            <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ minWidth: '180px', borderRadius: '10px', boxShadow: '0 8px 20px hsl(var(--primary)/0.2)' }}>
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save & Apply Branding
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ────── INVOICE MODAL (Printable) ────── */}

            {/* ────── INVOICE MODAL (Printable) ────── */}

            {selectedInvoice && (

                <div style={{

                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',

                    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',

                    justifyContent: 'center', zIndex: 1000

                }} onClick={() => setSelectedInvoice(null)}>

                    <div onClick={(e) => e.stopPropagation()} style={{

                        position: 'relative', width: 'auto', maxHeight: '95vh'

                    }}>

                        {/* Wrapper for printer to ensure it only prints this */}

                        <div id="printable-invoice" style={{

                            background: 'white', borderRadius: '0', width: '210mm', minHeight: '297mm', // A4 dimensions

                            margin: '0 auto', boxShadow: '0 0 50px rgba(0,0,0,0.5)', overflow: 'hidden',

                            color: 'black', fontFamily: 'Inter, sans-serif'

                        }}>

                            {/* Invoice Header */}

                            <div style={{

                                padding: '3rem', borderBottom: '3px solid #6366f1',

                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'

                            }}>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        {settings.shop_logo ? (
                                            <img src={settings.shop_logo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                                        ) : (
                                            <span style={{ fontSize: '1.75rem' }}>💮</span>
                                        )}
                                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: '#111827' }}>{settings.shop_name}</h1>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, maxWidth: '300px' }}>{settings.shop_address || 'Premium Textiles'}</p>
                                    {settings.shop_gstin && <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>GSTIN: {settings.shop_gstin}</p>}
                                </div>

                                <div style={{ textAlign: 'right' }}>

                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>INVOICE</div>

                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.25rem', color: '#374151' }}>#{selectedInvoice.id}</div>

                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>

                                        {new Date(selectedInvoice.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

                                    </div>

                                </div>

                            </div>



                            {/* Bill To */}

                            <div style={{ padding: '2rem 3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                                <div>

                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bill To</div>

                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{selectedInvoice.customer_name || 'WhatsApp Customer'}</div>

                                    <div style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.25rem' }}>{selectedInvoice.customer_phone}</div>

                                    {selectedInvoice.delivery_address && (

                                        <div style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>

                                            {selectedInvoice.delivery_address}

                                        </div>

                                    )}

                                </div>

                                <div style={{ textAlign: 'right' }}>

                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Info</div>

                                    <div style={{ fontSize: '0.9rem', color: '#374151' }}>Method: <strong>{selectedInvoice.payment_method || 'N/A'}</strong></div>

                                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#374151' }}>

                                        Status: <span style={{

                                            padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,

                                            background: '#f3f4f6', border: '1px solid #e5e7eb',

                                            color: '#374151', textTransform: 'uppercase'

                                        }}>{selectedInvoice.status}</span>

                                    </div>

                                </div>

                            </div>



                            {/* Items Table */}

                            <div style={{ padding: '0 3rem' }}>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>

                                    <thead>

                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>

                                            <th style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>#</th>

                                            <th style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Item</th>

                                            <th style={{ padding: '0.75rem 0', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>

                                            <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Price</th>

                                            <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {invoiceItems.length === 0 ? (

                                            <tr><td colSpan={5} style={{ padding: '1.5rem 0', textAlign: 'center', color: '#9ca3af' }}>No items recorded</td></tr>

                                        ) : (

                                            invoiceItems.map((item, i) => (

                                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>

                                                    <td style={{ padding: '1rem 0', color: '#9ca3af' }}>{i + 1}</td>

                                                    <td style={{ padding: '1rem 0', fontWeight: 500, color: '#111827' }}>{item.product_name}</td>

                                                    <td style={{ padding: '1rem 0', textAlign: 'center', color: '#374151' }}>{item.quantity}</td>

                                                    <td style={{ padding: '1rem 0', textAlign: 'right', color: '#374151' }}>₹{(item.price_at_time || 0).toLocaleString()}</td>

                                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>₹{((item.price_at_time || 0) * item.quantity).toLocaleString()}</td>

                                                </tr>

                                            ))

                                        )}

                                    </tbody>

                                </table>

                            </div>



                            {/* Total */}

                            <div style={{ padding: '2rem 3rem' }}>

                                <div style={{

                                    display: 'flex', justifyContent: 'flex-end',

                                    padding: '1.5rem', background: '#f9fafb',

                                    borderRadius: '0.75rem'

                                }}>

                                    <div style={{ textAlign: 'right' }}>

                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Grand Total</div>

                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1' }}>

                                            ₹{(selectedInvoice.total_amount || 0).toLocaleString()}

                                        </div>

                                    </div>

                                </div>

                            </div>



                            {/* Terms & Footer */}
                            <div style={{ padding: '0 3rem 4rem 3rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                <div>
                                    {settings.bill_terms && (
                                        <>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Terms & Conditions</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{settings.bill_terms}</div>
                                        </>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563', margin: 0 }}>{settings.bill_footer}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>WhatsApp: +{settings.business_phone || '91 75581 89732'}</p>
                                </div>
                            </div>

                        </div>



                        {/* Floating Action Buttons for the Modal */}

                        <div style={{

                            position: 'absolute', top: '1rem', right: '-4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'

                        }}>

                            <button onClick={() => setSelectedInvoice(null)} style={{

                                width: '3rem', height: '3rem', borderRadius: '50%',

                                background: 'white', color: 'black', border: 'none',

                                display: 'flex', alignItems: 'center', justifyContent: 'center',

                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'

                            }} title="Close">

                                <span style={{ fontSize: '24px', lineHeight: 1 }}>&times;</span>

                            </button>

                            <button onClick={printInvoice} style={{

                                width: '3rem', height: '3rem', borderRadius: '50%',

                                background: '#6366f1', color: 'white', border: 'none',

                                display: 'flex', alignItems: 'center', justifyContent: 'center',

                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'

                            }} title="Print">

                                <Printer size={20} />

                            </button>

                            <a href={`https://wa.me/${selectedInvoice.customer_phone}`} target="_self" style={{

                                width: '3rem', height: '3rem', borderRadius: '50%',

                                background: '#25D366', color: 'white', border: 'none',

                                display: 'flex', alignItems: 'center', justifyContent: 'center',

                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'

                            }} title="WhatsApp">

                                <MessageCircle size={20} />

                            </a>

                        </div>

                    </div>

                </div>

            )}



            <style jsx>{`

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media print {

                    body * { visibility: hidden; }

                    #printable-invoice, #printable-invoice * { visibility: visible; }

                    #printable-invoice { 

                        position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; 

                        box-shadow: none !important; border-radius: 0 !important;

                    }

                }

            `}</style>

        </div>

    );

}

