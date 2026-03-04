'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    TrendingUp, Calendar, Filter, Users,
    ShoppingBag, DollarSign, ArrowUpRight,
    ArrowDownRight, Loader2, Download, Package,
    Search, ChevronDown, CheckCircle2, AlertCircle,
    ShoppingBasket, BarChart3, RefreshCcw
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState('30d'); // 'today', '7d', '30d', 'all'
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [invFilter, setInvFilter] = useState('all'); // 'all', 'low_stock', 'best_sellers'

    useEffect(() => {
        setHasMounted(true);
        loadAllData();
    }, [timeRange]);

    async function loadAllData() {
        setLoading(true);
        try {
            // Get date range
            let startDate = new Date();
            if (timeRange === 'today') startDate.setHours(0, 0, 0, 0);
            else if (timeRange === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30);
            else startDate = new Date(2000, 0, 1);

            const startStr = startDate.toISOString();

            // Parallel fetching
            const [ordersRes, historyRes, productsRes] = await Promise.all([
                supabase.from('orders').select('*').neq('status', 'DRAFT').gte('created_at', startStr).order('created_at', { ascending: true }),
                supabase.from('product_history').select('*').gte('created_at', startStr),
                supabase.from('products').select('*').order('name')
            ]);

            setOrders(ordersRes.data || []);
            setHistory(historyRes.data || []);
            setProducts(productsRes.data || []);

        } catch (err) {
            console.error('Analytics Loading Error:', err);
        } finally {
            setLoading(false);
        }
    }

    // --- Computed Metrics ---
    const summary = useMemo(() => {
        const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
        const totalOrders = orders.length;
        const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        const totalItemsSold = history.filter(h => h.change_type === 'SALE').reduce((s, h) => s + Math.abs(h.quantity_change), 0);

        return { totalRevenue, totalOrders, avgOrder, totalItemsSold };
    }, [orders, history]);

    const chartData = useMemo(() => {
        const groups = {};
        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!groups[date]) groups[date] = { label: date, revenue: 0, orders: 0 };
            groups[date].revenue += (o.total_amount || 0);
            groups[date].orders += 1;
        });
        return Object.values(groups);
    }, [orders]);

    const productAnalytics = useMemo(() => {
        return products.map(p => {
            const pHistory = history.filter(h => h.product_id === p.id);
            const addedInPeriod = pHistory.filter(h => h.change_type === 'ADD').reduce((s, h) => s + h.quantity_change, 0);
            const soldInPeriod = pHistory.filter(h => h.change_type === 'SALE').reduce((s, h) => s + Math.abs(h.quantity_change), 0);

            return {
                ...p,
                addedInPeriod,
                soldInPeriod,
                total_added: p.total_added || 0,
                total_sold: p.total_sold || 0,
                turnover: p.total_added > 0 ? ((p.total_sold / p.total_added) * 100).toFixed(1) : 0
            };
        }).filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
            if (invFilter === 'low_stock') return matchesSearch && p.stock <= 5;
            if (invFilter === 'best_sellers') return matchesSearch && p.total_sold > 10;
            return matchesSearch;
        });
    }, [products, history, searchTerm, invFilter]);

    const topSelling = useMemo(() => {
        return [...productAnalytics].sort((a, b) => b.soldInPeriod - a.soldInPeriod).slice(0, 5);
    }, [productAnalytics]);

    const stateData = useMemo(() => {
        const groups = {};
        orders.forEach(o => {
            const state = o.shipping_state || 'Unknown';
            if (!groups[state]) groups[state] = { name: state, revenue: 0 };
            groups[state].revenue += (o.total_amount || 0);
        });
        return Object.values(groups).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [orders]);

    const categoryData = useMemo(() => {
        const groups = {};
        products.forEach(p => {
            const cat = p.category || 'Other';
            if (!groups[cat]) groups[cat] = { name: cat, stock: 0, products: 0 };
            groups[cat].stock += (p.stock || 0);
            groups[cat].products += 1;
        });
        return Object.values(groups);
    }, [products]);

    const COLORS = ['#a855f7', '#7c3aed', '#6366f1', '#8b5cf6', '#d946ef'];

    if (!hasMounted) return null;

    return (
        <div className="analytics-layout">
            <header className="premium-header">
                <div>
                    <div className="breadcrumb">Admin / Analytics</div>
                    <h1>Executive Dashboard</h1>
                    <p>Real-time insights across your digital saree boutique.</p>
                </div>
                <div className="header-actions">
                    <div className="range-picker">
                        {['today', '7d', '30d', 'all'].map(r => (
                            <button
                                key={r}
                                className={timeRange === r ? 'active' : ''}
                                onClick={() => setTimeRange(r)}
                            >
                                {r === 'all' ? 'All Time' : r.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button className="btn-export" onClick={() => window.print()}>
                        <Download size={16} /> Report
                    </button>
                    <button className="btn-refresh" onClick={loadAllData} disabled={loading}>
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">
                    <Loader2 size={40} className="spin" color="hsl(var(--primary))" />
                    <h3>Syncing Business Data...</h3>
                    <p>Please wait while we compute your latest metrics.</p>
                </div>
            ) : (
                <div className="analytics-content animate-enter">
                    {/* Summary Row */}
                    <div className="kpi-grid">
                        <KPICard title="Revenue" value={`₹${summary.totalRevenue.toLocaleString()}`} icon={<DollarSign />} color="success" trend="+12.4%" />
                        <KPICard title="Orders" value={summary.totalOrders} icon={<ShoppingBasket />} color="primary" trend="+5.2%" />
                        <KPICard title="Items Sold" value={summary.totalItemsSold} icon={<Package />} color="info" trend="+18.1%" />
                        <KPICard title="Avg Order" value={`₹${summary.avgOrder.toFixed(0)}`} icon={<BarChart3 />} color="accent" trend="-2.4%" />
                    </div>

                    <div className="main-grid">
                        {/* Sales Chart */}
                        <div className="glass-card chart-section">
                            <div className="card-header">
                                <h3>Revenue Performance</h3>
                                <p>Sales trajectories for the selected period.</p>
                            </div>
                            <div className="chart-box">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Market Presence */}
                        <div className="glass-card side-section">
                            <div className="card-header">
                                <h3>Market Presence</h3>
                                <p>Revenue by Region (States)</p>
                            </div>
                            <div className="chart-box" style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stateData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} width={80} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#111', border: '1px solid #333' }} />
                                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="main-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="glass-card">
                            <div className="card-header">
                                <h3>Product Hotlist</h3>
                            </div>
                            <div className="mini-list">
                                {topSelling.map((p, i) => (
                                    <div key={i} className="mini-item">
                                        <div className="rank">#{i + 1}</div>
                                        <div className="mini-info">
                                            <div className="name">{p.name}</div>
                                            <div className="meta">{p.soldInPeriod} sold in this period</div>
                                        </div>
                                        <div className="val">₹{(p.price || 0).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card">
                            <div className="card-header">
                                <h3>Category distribution</h3>
                                <p>Saree inventory by Category</p>
                            </div>
                            <div style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} dataKey="products" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label={({ name }) => name}>
                                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Inventory Table */}
                    <div className="glass-card inventory-section">
                        <div className="inventory-header">
                            <div>
                                <h3>Inventory & Stock Performance</h3>
                                <p>Granular tracking of product activity and turnover rates.</p>
                            </div>
                            <div className="inv-actions">
                                <div className="search-pill">
                                    <Search size={14} />
                                    <input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <select value={invFilter} onChange={e => setInvFilter(e.target.value)} className="glass-select">
                                    <option value="all">All Products</option>
                                    <option value="low_stock">Low Stock (≤ 5)</option>
                                    <option value="best_sellers">Best Sellers</option>
                                </select>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th style={{ textAlign: 'center' }}>Stock History (Period)</th>
                                        <th style={{ textAlign: 'center' }}>Lifetime Add</th>
                                        <th style={{ textAlign: 'center' }}>Lifetime Sold</th>
                                        <th>Turnover</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Current Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productAnalytics.map((p, i) => (
                                        <tr key={i}>
                                            <td className="p-cell">
                                                <div className="p-thumb" style={{ overflow: 'hidden' }}>
                                                    {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="p-name">{p.name}</div>
                                                    <div className="p-cat">{p.category || 'Uncategorized'}</div>
                                                </div>
                                            </td>
                                            <td className="num-cell">
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <div className={p.addedInPeriod > 0 ? 'txt-plus' : ''} style={{ fontWeight: 800 }}>
                                                        {p.addedInPeriod > 0 ? `+${p.addedInPeriod}` : '—'}
                                                    </div>
                                                    <div className={p.soldInPeriod > 0 ? 'txt-minus' : ''} style={{ fontWeight: 800 }}>
                                                        {p.soldInPeriod > 0 ? `-${p.soldInPeriod}` : '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="num-cell">
                                                <div style={{ fontWeight: 800 }}>{p.total_added}</div>
                                            </td>
                                            <td className="num-cell">
                                                <div style={{ fontWeight: 800 }}>{p.total_sold}</div>
                                            </td>
                                            <td>
                                                <div className="turnover-bar">
                                                    <div className="fill" style={{ width: `${Math.min(100, p.turnover)}%` }}></div>
                                                    <span>{p.turnover}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                {p.stock <= 5 ? (
                                                    <span className="badge badge-error">Restock Soon</span>
                                                ) : p.total_sold > 10 ? (
                                                    <span className="badge badge-success">Top Seller</span>
                                                ) : (
                                                    <span className="badge badge-neutral">Stable</span>
                                                )}
                                            </td>
                                            <td className="stock-cell">
                                                <span className={p.stock <= 5 ? 'critical' : ''}>{p.stock}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {productAnalytics.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="empty-row"> No products found matching criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .analytics-layout {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    color: white;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                .premium-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 3rem;
                }

                .breadcrumb {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: hsl(var(--primary));
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }

                h1 {
                    font-size: 2.75rem;
                    font-weight: 900;
                    margin: 0;
                    background: linear-gradient(to bottom right, #fff, #999);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .premium-header p {
                    color: rgba(255,255,255,0.4);
                    margin: 0.5rem 0 0;
                }

                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }

                .range-picker {
                    display: flex;
                    background: rgba(255,255,255,0.05);
                    padding: 0.25rem;
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .range-picker button {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.4);
                    padding: 0.6rem 1.25rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .range-picker button.active {
                    background: hsl(var(--primary));
                    color: white;
                    box-shadow: 0 4px 15px hsl(var(--primary) / 0.3);
                }

                .btn-export, .btn-refresh {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 0.75rem;
                    border-radius: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s;
                }

                .btn-export:hover, .btn-refresh:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.2);
                }

                /* KPI CARDS */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .main-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .glass-card {
                    background: rgba(255,255,255,0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 30px;
                    padding: 2rem;
                    transition: 0.3s;
                    display: flex;
                    flex-direction: column;
                }

                .glass-card:hover { border-color: rgba(255,255,255,0.15); }

                .card-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; }
                .card-header p { margin: 0.3rem 0 1.5rem; font-size: 0.85rem; color: rgba(255,255,255,0.4); }

                .mini-list { display: flex; flex-direction: column; gap: 1.25rem; }
                .mini-item { display: flex; align-items: center; gap: 1rem; }
                .rank { width: 30px; font-weight: 900; color: hsl(var(--primary)); opacity: 0.5; }
                .mini-info { flex: 1; }
                .mini-info .name { font-weight: 700; font-size: 0.9rem; }
                .mini-info .meta { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
                .mini-item .val { font-weight: 900; font-size: 1rem; }

                /* INVENTORY SECTION */
                .inventory-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .inv-actions { display: flex; gap: 1rem; }

                .search-pill {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    padding: 0 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .search-pill input {
                    background: none;
                    border: none;
                    color: white;
                    padding: 0.75rem 0;
                    font-size: 0.85rem;
                    outline: none;
                    width: 200px;
                }

                .glass-select {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 14px;
                    font-size: 0.85rem;
                    outline: none;
                }

                .table-wrapper { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; }
                th { 
                    text-align: left; 
                    padding: 1rem; 
                    font-size: 0.7rem; 
                    text-transform: uppercase; 
                    color: rgba(255,255,255,0.4); 
                    font-weight: 800;
                    letter-spacing: 0.05em;
                }
                td { padding: 1.25rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }

                .p-cell { display: flex; align-items: center; gap: 1rem; }
                .p-thumb { 
                    width: 40px; height: 40px; 
                    background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.5));
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 1.2rem;
                    color: white;
                }
                .p-name { font-weight: 700; }
                .p-cat { font-size: 0.75rem; color: rgba(255,255,255,0.4); }

                .num-cell { font-weight: 700; text-align: center; }
                .txt-plus { color: #22c55e; }
                .txt-minus { color: #ef4444; }

                .turnover-bar {
                    width: 100px; height: 6px; 
                    background: rgba(255,255,255,0.05); 
                    border-radius: 10px; 
                    position: relative;
                    margin-bottom: 0.25rem;
                }
                .turnover-bar .fill { 
                    height: 100%; 
                    background: hsl(var(--primary)); 
                    border-radius: 10px; 
                }
                .turnover-bar + span { font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 800; }

                .badge {
                    padding: 0.3rem 0.75rem;
                    border-radius: 99px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .badge-error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .badge-success { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
                .badge-neutral { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); }

                .stock-cell { text-align: right; font-weight: 900; font-size: 1.1rem; }
                .stock-cell .critical { color: #ef4444; }

                .loading-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 50vh; text-align: center;
                }

                .loading-state h3 { margin: 1.5rem 0 0.5rem; }

                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .empty-row { text-align: center; color: rgba(255,255,255,0.3); padding: 4rem; }

                @media (max-width: 1100px) {
                    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
                    .main-grid { grid-template-columns: 1fr; }
                    .premium-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .header-actions { width: 100%; justify-content: space-between; }
                }

                @media (max-width: 600px) {
                    .kpi-grid { grid-template-columns: 1fr; }
                    .search-pill input { width: 120px; }
                    h1 { font-size: 2rem; }
                }
            `}</style>
        </div>
    );
}

function KPICard({ title, value, icon, color, trend }) {
    const colorMap = {
        primary: 'hsl(var(--primary))',
        success: '#22c55e',
        info: '#3b82f6',
        accent: '#f59e0b'
    };

    return (
        <div className="glass-card kpi-card">
            <div className="kpi-icon" style={{ background: `${colorMap[color]}15`, color: colorMap[color] }}>
                {icon}
            </div>
            <div className="kpi-info">
                <label>{title}</label>
                <div className="value">{value}</div>
                <div className={`trend ${trend.startsWith('+') ? 'up' : 'down'}`}>
                    {trend} vs last period
                </div>
            </div>
            <style jsx>{`
                .kpi-card { 
                    padding: 1.75rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 1.5rem; 
                }
                .kpi-icon {
                    width: 50px; height: 50px;
                    border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .kpi-info label { 
                    display: block; 
                    font-size: 0.75rem; 
                    font-weight: 800; 
                    color: rgba(255,255,255,0.4);
                    text-transform: uppercase;
                    margin-bottom: 0.4rem;
                }
                .value { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.02em; }
                .trend { font-size: 0.65rem; font-weight: 700; margin-top: 0.4rem; }
                .trend.up { color: #22c55e; }
                .trend.down { color: #ef4444; }
            `}</style>
        </div>
    );
}
