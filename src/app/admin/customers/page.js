'use client';



import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

import { Search, Loader2, MessageCircle, Phone, ShoppingBag, DollarSign, MapPin, Calendar, TrendingUp, Users, Award } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';



export default function CustomersPage() {

    const [customers, setCustomers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [customerOrders, setCustomerOrders] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'
    const [timeRange, setTimeRange] = useState('ALL'); // DAILY, MONTHLY, QUARTERLY, ALL
    const [analyticsData, setAnalyticsData] = useState({
        tierData: [],
        growthData: [],
        repeatData: []
    });
    const [hasMounted, setHasMounted] = useState(false);



    useEffect(() => {

        setHasMounted(true);

        const fetchCustomers = async () => {
            setLoading(true);
            try {
                // 1. Fetch all customers
                const { data: allCustomers, error: custError } = await supabase
                    .from('customers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (custError) throw custError;

                // 2. Fetch all orders (except drafts) to aggregate stats
                let orderQuery = supabase.from('orders').select('*').neq('status', 'DRAFT');

                const now = new Date();
                if (timeRange === 'DAILY') {
                    orderQuery = orderQuery.gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
                } else if (timeRange === 'MONTHLY') {
                    orderQuery = orderQuery.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
                } else if (timeRange === 'QUARTERLY') {
                    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
                    orderQuery = orderQuery.gte('created_at', new Date(now.getFullYear(), qStartMonth, 1).toISOString());
                }

                const { data: allOrders, error: orderError } = await orderQuery.order('created_at', { ascending: false });

                if (orderError) throw orderError;

                // 3. Map orders to customers
                const customerMap = {};

                const normalizePhone = (p) => {
                    if (!p) return '';
                    const clean = p.replace(/\D/g, '');
                    return clean.startsWith('91') ? clean : (clean.length === 10 ? `91${clean}` : clean);
                };

                (allCustomers || []).forEach(cust => {
                    const normPhone = normalizePhone(cust.phone);
                    if (normPhone) {
                        customerMap[normPhone] = {
                            phone: normPhone,
                            name: cust.name || 'WhatsApp Customer',
                            totalOrders: 0,
                            totalSpent: 0,
                            lastOrder: cust.created_at,
                            lastAddress: cust.address || '',
                            orders: []
                        };
                    }
                });

                (allOrders || []).forEach(order => {
                    const normPhone = normalizePhone(order.customer_phone);

                    if (normPhone) {
                        if (!customerMap[normPhone]) {
                            customerMap[normPhone] = {
                                phone: normPhone,
                                name: order.customer_name || 'User',
                                totalOrders: 0,
                                totalSpent: 0,
                                lastOrder: order.created_at,
                                lastAddress: order.delivery_address || '',
                                orders: []
                            };
                        }

                        customerMap[normPhone].totalOrders++;
                        customerMap[normPhone].totalSpent += order.total_amount || 0;
                        customerMap[normPhone].orders.push(order);

                        // Use most recent order date for 'lastOrder' in terms of activity
                        if (new Date(order.created_at) > new Date(customerMap[normPhone].lastOrder)) {
                            customerMap[normPhone].lastOrder = order.created_at;
                        }

                        if (order.customer_name && order.customer_name !== 'WhatsApp Customer' && order.customer_name !== 'Website User') {
                            customerMap[normPhone].name = order.customer_name;
                        }
                        if (order.delivery_address && !customerMap[normPhone].lastAddress) {
                            customerMap[normPhone].lastAddress = order.delivery_address;
                        }
                    }
                });

                const customerList = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

                setCustomers(customerList);

                // --- Analytics Logic ---
                // 1. Tier Data
                const tiers = { VIP: 0, Gold: 0, Silver: 0, Regular: 0 };
                customerList.forEach(c => {
                    if (c.totalSpent >= 15000) tiers.VIP++;
                    else if (c.totalSpent >= 7000) tiers.Gold++;
                    else if (c.totalSpent >= 2000) tiers.Silver++;
                    else if (c.totalSpent > 0) tiers.Regular++;
                });
                const tierData = [
                    { name: 'VIP', value: tiers.VIP, color: '#f59e0b' },
                    { name: 'Gold', value: tiers.Gold, color: '#fbbf24' },
                    { name: 'Silver', value: tiers.Silver, color: '#94a3b8' },
                    { name: 'Regular', value: tiers.Regular, color: '#cbd5e1' }
                ].filter(t => t.value > 0);

                // 2. Repeat Data
                const repeatCount = customerList.filter(c => c.totalOrders > 1).length;
                const activeCount = customerList.filter(c => c.totalOrders > 0).length;
                const repeatData = [
                    { name: 'Repeat', value: repeatCount, color: 'hsl(var(--primary))' },
                    { name: 'Single', value: activeCount - repeatCount, color: 'hsl(var(--accent))' }
                ];

                // 3. Growth Data (Simplified by last order date)
                // const growth = {};
                // customerList.forEach(c => {
                //     const date = new Date(c.orders[0]?.created_at || c.lastOrder);
                //     const month = date.toLocaleDateString('en-IN', { month: 'short' });
                //     growth[month] = (growth[month] || 0) + 1;
                // });
                // const growthData = Object.entries(growth).map(([name, value]) => ({ name, value }));

                setAnalyticsData({ tierData, repeatData, growthData: [] });
            } catch (err) {
                console.error('Customer Load Error:', err);
            } finally {
                setLoading(false);
            }
        };



        fetchCustomers();

    }, [timeRange]); // Re-fetch on time range change



    const openCustomerDetail = (customer) => {

        setSelectedCustomer(customer);

        setCustomerOrders(customer.orders);

    };



    const getStatusReference = (status) => {

        switch (status) {

            case 'PLACED': return 'badge-placed';

            case 'CONFIRMED': return 'badge-confirmed';

            case 'SHIPPED': return 'badge-shipped';

            case 'DELIVERED': return 'badge-delivered';

            case 'CANCELLED': return 'badge-cancelled';

            default: return 'badge';

        }

    };



    const filteredCustomers = customers.filter(c =>

        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||

        c.phone.includes(searchTerm)

    );



    const getTierBadge = (spent) => {

        if (spent >= 20000) return { label: '💎 VIP', className: 'badge badge-confirmed', style: { background: 'linear-gradient(135deg, hsl(43 96% 64%), hsl(28 92% 54%))', color: '#3f2203', border: 'none' } };

        if (spent >= 10000) return { label: '🥇 Gold', className: 'badge', style: { background: 'hsl(48 96% 89%)', color: 'hsl(38 92% 50%)', borderColor: 'hsl(48 96% 70%)' } };

        if (spent >= 5000) return { label: '🥈 Silver', className: 'badge', style: { background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-muted))', borderColor: 'hsl(var(--border-subtle))' } };

        return { label: 'Regular', className: 'badge', style: { background: 'transparent', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border-subtle))' } };

    };



    return (

        <div className="animate-enter">

            {!hasMounted || loading ? (

                <div className="safe-loading">

                    <Loader2 size={24} className="animate-spin" /> Loading Customers...

                </div>

            ) : (

                <>

                    {/* Header */}

                    <div className="admin-header-row">

                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Customers</h1>
                            <p>All registered customers from Website & WhatsApp • {customers.length} total</p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 'var(--radius)', padding: '4px' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                                        background: viewMode === 'list' ? 'hsl(var(--primary))' : 'transparent',
                                        color: viewMode === 'list' ? 'white' : 'hsl(var(--text-muted))'
                                    }}>List View</button>
                                <button
                                    onClick={() => setViewMode('analytics')}
                                    style={{
                                        padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                                        background: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'transparent',
                                        color: viewMode === 'analytics' ? 'white' : 'hsl(var(--text-muted))'
                                    }}><TrendingUp size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Analysis</button>
                            </div>
                        </div>
                    </div>

                    {/* ─── ANALYTICS VIEW ─── */}
                    {viewMode === 'analytics' && (
                        <div className="animate-enter">
                            {/* Time Filters */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid hsl(var(--border-subtle))' }}>
                                {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} style={{
                                        padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                        background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                        color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                                    }}>{r}</button>
                                ))}
                            </div>

                            <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
                                {/* Tier Distribution */}
                                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Award size={20} color="#f59e0b" /> Loyalty Segmentation
                                    </h3>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analyticsData.tierData}
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analyticsData.tierData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Repeat vs New */}
                                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <TrendingUp size={20} color="hsl(var(--primary))" /> Repeat Purchase Rate
                                    </h3>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analyticsData.repeatData}
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analyticsData.repeatData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Growth Chart */}
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} color="hsl(var(--success))" /> New Customer Acquisition
                                </h3>
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.growthData}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                            <Tooltip
                                                contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }}
                                            />
                                            <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <>



                            {/* Stats */}

                            <div className="admin-grid-3">

                                {[

                                    { label: 'Total Customers', value: customers.length, icon: '👥', color: 'hsl(var(--primary))' },

                                    { label: 'Average Spend', value: `₹${customers.length ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length).toLocaleString() : 0}`, icon: '💰', color: 'hsl(var(--success))' },

                                    { label: 'Repeat Customers', value: customers.filter(c => c.totalOrders > 1).length, icon: '🔄', color: 'hsl(var(--warning))' },

                                ].map((stat, i) => (

                                    <div key={i} className="card" style={{

                                        padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'

                                    }}>

                                        <div>

                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>

                                            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>{stat.value}</div>

                                        </div>

                                        <div style={{

                                            fontSize: '1.5rem', width: '48px', height: '48px', borderRadius: '50%',

                                            background: `hsl(from ${stat.color} h s l / 0.1)`, color: stat.color,

                                            display: 'flex', alignItems: 'center', justifyContent: 'center'

                                        }}>{stat.icon}</div>

                                    </div>

                                ))}

                            </div>



                            {/* Customer List */}

                            <div className="card" style={{ padding: 0 }}>

                                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))' }}>

                                    <div style={{ position: 'relative', maxWidth: '400px' }}>

                                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />

                                        <input

                                            type="text" placeholder="Search by name or phone..."

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

                                            <th>Customer</th>

                                            <th>Phone</th>

                                            <th style={{ textAlign: 'center' }}>Orders</th>

                                            <th style={{ textAlign: 'right' }}>Total Spent</th>

                                            <th style={{ textAlign: 'center' }}>Tier</th>

                                            <th style={{ textAlign: 'left' }}>Last Order</th>

                                            <th style={{ textAlign: 'right' }}>Actions</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {filteredCustomers.length === 0 ? (

                                            <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No customers found.</td></tr>

                                        ) : (

                                            filteredCustomers.map((customer, i) => {

                                                const tier = getTierBadge(customer.totalSpent);

                                                return (

                                                    <tr key={customer.phone} onClick={() => openCustomerDetail(customer)}>

                                                        <td style={{ padding: '1rem 1.5rem' }}>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                                                                <div style={{

                                                                    width: '40px', height: '40px', borderRadius: '50%',

                                                                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',

                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',

                                                                    fontWeight: 700, fontSize: '0.9rem', color: 'white',

                                                                    boxShadow: '0 2px 8px hsl(var(--primary) / 0.3)'

                                                                }}>

                                                                    {customer.name.charAt(0).toUpperCase()}

                                                                </div>

                                                                <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{customer.name}</div>

                                                            </div>

                                                        </td>

                                                        <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{customer.phone}</td>

                                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{customer.totalOrders}</td>

                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{customer.totalSpent.toLocaleString()}</td>

                                                        <td style={{ textAlign: 'center' }}>

                                                            <span className={tier.className} style={tier.style}>{tier.label}</span>

                                                        </td>

                                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>

                                                            {new Date(customer.lastOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

                                                        </td>

                                                        <td style={{ textAlign: 'right' }}>

                                                            <a href={`https://wa.me/${customer.phone}`} target="_self"

                                                                onClick={(e) => e.stopPropagation()}

                                                                className="btn"

                                                                style={{

                                                                    padding: '0.4rem 0.8rem', fontSize: '0.75rem',

                                                                    background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))',

                                                                    border: '1px solid hsl(var(--success) / 0.2)',

                                                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem'

                                                                }}>

                                                                <MessageCircle size={14} /> Chat

                                                            </a>

                                                        </td>

                                                    </tr>

                                                );

                                            })

                                        )}

                                    </tbody>

                                </table>

                            </div>
                        </>
                    )}



                    {/* Customer Detail Modal */}

                    {selectedCustomer && (

                        <div style={{

                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',

                            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',

                            justifyContent: 'center', zIndex: 1000

                        }} onClick={() => setSelectedCustomer(null)}>

                            <div onClick={(e) => e.stopPropagation()} className="card" style={{

                                width: '600px', maxHeight: '90vh', overflow: 'hidden', padding: 0,

                                border: '1px solid hsl(var(--primary) / 0.3)',

                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'

                            }}>

                                <div style={{

                                    padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))',

                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                                    background: 'hsl(var(--bg-panel))'

                                }}>

                                    <div>

                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{selectedCustomer.name}</h2>

                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>

                                            <Phone size={14} /> {selectedCustomer.phone}

                                        </div>

                                    </div>

                                    <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '24px', lineHeight: 1 }}>
                                        &times;
                                    </button>

                                </div>



                                <div style={{ padding: '2rem', overflow: 'auto' }}>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

                                        <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>

                                            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--text-main))' }}>{selectedCustomer.totalOrders}</div>

                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORDERS</div>

                                        </div>

                                        <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>

                                            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--success))' }}>₹{selectedCustomer.totalSpent.toLocaleString()}</div>

                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL SPENT</div>

                                        </div>

                                    </div>



                                    {selectedCustomer.lastAddress && (

                                        <div style={{

                                            padding: '1.25rem', background: 'hsl(40 96% 15% / 0.1)', borderRadius: 'var(--radius-sm)',

                                            border: '1px solid hsl(40 96% 40% / 0.2)', marginBottom: '2rem'

                                        }}>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'hsl(40 96% 60%)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>

                                                <MapPin size={14} /> Last Delivery Address

                                            </div>

                                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-main))', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>

                                                {selectedCustomer.lastAddress}

                                            </div>

                                        </div>

                                    )}



                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Order History</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                                        {customerOrders.map(order => (

                                            <div key={order.id} style={{

                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                                                padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)',

                                                border: '1px solid hsl(var(--border-subtle))'

                                            }}>

                                                <div>

                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--primary))' }}>#{order.id}</div>

                                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>

                                                </div>

                                                <div style={{ textAlign: 'right' }}>

                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>₹{(order.total_amount || 0).toLocaleString()}</div>

                                                    <span className={`badge ${getStatusReference(order.status)}`} style={{ fontSize: '0.7rem' }}>{order.status}</span>

                                                </div>

                                            </div>

                                        ))}

                                    </div>



                                    <a href={`https://wa.me/${selectedCustomer.phone}`} target="_self" style={{

                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',

                                        padding: '1rem', background: 'hsl(var(--success))', color: 'hsl(var(--bg-app))', marginTop: '2rem',

                                        borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.95rem',

                                        textDecoration: 'none', boxShadow: '0 4px 15px hsl(var(--success) / 0.4)',

                                        transition: 'transform 0.2s',

                                        cursor: 'pointer'

                                    }}>

                                        <MessageCircle size={20} /> Chat on WhatsApp

                                    </a>

                                </div>

                            </div>

                        </div>

                    )}



                </>

            )}



            <style jsx>{`

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

            `}</style>

        </div>

    );

}

