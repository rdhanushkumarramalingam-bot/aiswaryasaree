'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Loader2, X, Image, LayoutGrid, List, Share2, Link as LinkIcon, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
    const [copiedId, setCopiedId] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);

    const getShopUrl = (pid) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        return `${baseUrl}/shop?pid=${pid}`;
    };

    const copyLink = (product) => {
        const url = getShopUrl(product.id);
        navigator.clipboard.writeText(url);
        setCopiedId(product.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const shareToStatus = (product) => {
        const url = getShopUrl(product.id);
        const text = encodeURIComponent(`🌸 Checkout this beautiful ${product.name}!\n\nView details & Order here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
            setProducts(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
    }, []);

    if (!hasMounted) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: Number(formData.get('price')),
            stock: Number(formData.get('stock')),
            image_url: formData.get('image') || '',
            description: formData.get('description'),
            is_active: true
        };
        try {
            if (currentProduct?.id) {
                await supabase.from('products').update(productData).eq('id', currentProduct.id);
            } else {
                await supabase.from('products').insert([productData]);
            }
            fetchProducts();
            setIsEditing(false);
            setCurrentProduct(null);
        } catch (error) {
            alert('Failed to save product');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this saree?')) {
            await supabase.from('products').delete().eq('id', id);
            fetchProducts();
        }
    };

    const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];
    let filtered = products.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term)
        ) && (categoryFilter === 'ALL' || p.category === categoryFilter);
    });
    filtered.sort((a, b) => {
        if (sortBy === 'low_stock') return (a.stock || 0) - (b.stock || 0);
        if (sortBy === 'high_price') return (b.price || 0) - (a.price || 0);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue = products.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);

    const inputStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
        background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
    };

    return (
        <div className="animate-enter">
            {/* Header */}
            <div className="admin-header-row">
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Products</h1>
                    <p>Manage your premium saree collection • {products.length} items</p>
                </div>
                <button onClick={() => { setCurrentProduct(null); setIsEditing(true); }} className="btn btn-primary">
                    <Plus size={18} /> Add Saree
                </button>
            </div>

            {/* Stats */}
            <div className="admin-grid-3">
                {[
                    { label: 'Total Products', value: products.length, color: 'hsl(var(--primary))' },
                    { label: 'Total Stock', value: `${totalStock} pcs`, color: 'hsl(var(--accent))' },
                    { label: 'Inventory Value', value: `₹${totalValue.toLocaleString()}`, color: 'hsl(var(--success))' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '1.5rem', borderTop: `3px solid ${s.color}` }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Category Tabs */}
            <div className="admin-filter-row">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                        padding: '0.5rem 1.1rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: categoryFilter === cat ? 'hsl(var(--primary))' : 'hsl(var(--bg-card))',
                        color: categoryFilter === cat ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                        border: categoryFilter === cat ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                    }}>
                        {cat === 'ALL' ? 'All Collections' : cat}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input type="text" placeholder="Search products..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
                </div>
                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '0.65rem 1rem', cursor: 'pointer' }}>
                    <option value="newest">Newest First</option>
                    <option value="low_stock">⚠️ Low Stock First</option>
                    <option value="high_price">Price: High to Low</option>
                </select>

                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 'var(--radius-sm)', padding: '3px' }}>
                    <button
                        onClick={() => setViewMode('table')}
                        title="Table View"
                        style={{
                            padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
                            background: viewMode === 'table' ? 'hsl(var(--primary))' : 'transparent',
                            color: viewMode === 'table' ? 'white' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}>
                        <List size={15} /> Table
                    </button>
                    <button
                        onClick={() => setViewMode('card')}
                        title="Card View"
                        style={{
                            padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
                            background: viewMode === 'card' ? 'hsl(var(--primary))' : 'transparent',
                            color: viewMode === 'card' ? 'white' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}>
                        <LayoutGrid size={15} /> Cards
                    </button>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{filtered.length} items</span>
            </div>

            {/* ─── TABLE VIEW ─── */}
            {viewMode === 'table' && (
                <div className="card" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                        </div>
                    ) : (
                        <table style={{ margin: 0 }}>
                            <thead style={{ background: 'hsl(var(--bg-panel))' }}>
                                <tr>
                                    <th>#</th>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th style={{ textAlign: 'right' }}>Price</th>
                                    <th style={{ textAlign: 'center' }}>Stock</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</td></tr>
                                ) : filtered.map((product, idx) => (
                                    <tr key={product.id}>
                                        <td style={{ padding: '0.75rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '0.75rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', background: 'hsl(var(--bg-app))', flexShrink: 0, border: '1px solid hsl(var(--border-subtle))' }}>
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'; }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Image size={18} color="hsl(var(--text-muted))" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {product.description || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 600, background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border-subtle))' }}>
                                                {product.category}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(product.price || 0).toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={product.stock < 5 ? 'badge badge-cancelled' : 'badge badge-delivered'}>
                                                {product.stock} pcs
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => copyLink(product)} title="Copy Link" className="btn btn-secondary" style={{ padding: '0.4rem', color: copiedId === product.id ? 'hsl(var(--success))' : 'inherit' }}>
                                                    {copiedId === product.id ? <Check size={15} /> : <LinkIcon size={15} />}
                                                </button>
                                                <button onClick={() => shareToStatus(product)} title="Share to Status" className="btn btn-secondary" style={{ padding: '0.4rem', color: '#25D366' }}>
                                                    <Share2 size={15} />
                                                </button>
                                                <button onClick={() => { setCurrentProduct(product); setIsEditing(true); }} className="btn btn-secondary" style={{ padding: '0.4rem' }}><Edit size={15} /></button>
                                                <button onClick={() => handleDelete(product.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ─── CARD VIEW ─── */}
            {viewMode === 'card' && (
                <div>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                            {filtered.map(product => (
                                <div key={product.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                                    {/* Product Image */}
                                    <div style={{ height: '190px', background: 'hsl(var(--bg-app))', overflow: 'hidden', position: 'relative' }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🌸</div>
                                        )}
                                        {/* Stock badge */}
                                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                            <span className={product.stock < 5 ? 'badge badge-cancelled' : 'badge badge-delivered'}>
                                                {product.stock} pcs
                                            </span>
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{product.category}</div>
                                        <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.95rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description || '—'}</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--primary))', marginBottom: '12px' }}>₹{(product.price || 0).toLocaleString()}</div>
                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => { setCurrentProduct(product); setIsEditing(true); }}
                                                className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                <Edit size={13} /> Edit
                                            </button>
                                            <button onClick={() => copyLink(product)}
                                                className="btn btn-secondary" style={{ padding: '0.5rem', flex: '0.5', color: copiedId === product.id ? 'hsl(var(--success))' : 'inherit' }}>
                                                {copiedId === product.id ? <Check size={13} /> : <LinkIcon size={13} />}
                                            </button>
                                            <button onClick={() => shareToStatus(product)}
                                                className="btn btn-secondary" style={{ padding: '0.5rem', flex: '0.5', color: '#25D366' }}>
                                                <Share2 size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)}
                                                className="btn btn-secondary" style={{ padding: '0.5rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── ADD / EDIT MODAL ─── */}
            {isEditing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setIsEditing(false)}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: 0, border: '1px solid hsl(var(--primary) / 0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-panel))' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{currentProduct ? '✏️ Edit Saree' : '➕ Add New Saree'}</h2>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}><X size={22} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '1.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                {[
                                    { label: 'Saree Name *', name: 'name', type: 'text', placeholder: 'e.g. Royal Kanjivaram Silk', defaultValue: currentProduct?.name, required: true },
                                    null, // category select
                                ].filter(Boolean).map(f => (
                                    <div key={f.name}>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>{f.label}</label>
                                        <input name={f.name} type={f.type} defaultValue={f.defaultValue} required={f.required}
                                            placeholder={f.placeholder} style={inputStyle} />
                                    </div>
                                ))}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Category *</label>
                                    <select name="category" defaultValue={currentProduct?.category || 'Silk Saree'} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option>Silk Saree</option>
                                        <option>Cotton Saree</option>
                                        <option>Designer</option>
                                        <option>Georgette</option>
                                        <option>Banarasi</option>
                                        <option>Chiffon</option>
                                        <option>Linen</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Price (₹) *</label>
                                    <input type="number" name="price" defaultValue={currentProduct?.price} required placeholder="e.g. 12500" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Stock Qty *</label>
                                    <input type="number" name="stock" defaultValue={currentProduct?.stock} required placeholder="e.g. 10" style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Description</label>
                                <textarea name="description" defaultValue={currentProduct?.description} rows={3}
                                    style={{ ...inputStyle, resize: 'vertical' }} placeholder="Fabric, colors, design details..." />
                            </div>
                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Image URL (WhatsApp display)</label>
                                <input name="image" defaultValue={currentProduct?.image_url} placeholder="https://..." style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">💾 Save Saree</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
