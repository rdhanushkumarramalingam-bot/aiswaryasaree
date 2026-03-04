'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, Image, LayoutGrid, List,
    Share2, Link as LinkIcon, Check, Package as PackageIcon, ShoppingBag,
    Filter, Facebook, History, MoreHorizontal, FileDown, Upload, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './page.module.css';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
    const [copiedId, setCopiedId] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
    const [groupFilter, setGroupFilter] = useState('ALL');

    // Facebook Integration States
    // Variant states
    const [variants, setVariants] = useState([]);
    const [productType, setProductType] = useState('simple');
    const [postToFacebook, setPostToFacebook] = useState(false);
    const [fbProcessing, setFbProcessing] = useState(false);
    const [fbConfig, setFbConfig] = useState(null);
    const [importModal, setImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [syncWithMeta, setSyncWithMeta] = useState(false);
    const [notification, setNotification] = useState(null);

    const fetchHistory = async (product) => {
        setSelectedProductForHistory(product);
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('product_history')
                .select('*')
                .eq('product_id', product.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setHistoryData(data || []);
        } catch (err) {
            console.error('History Fetch Error:', err.message || err);
            alert('Could not fetch history: ' + (err.message || 'Unknown error'));
        } finally {
            setHistoryLoading(false);
        }
    };

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
        const text = encodeURIComponent(`💮 Checkout this beautiful ${product.name}!\n\nView details & Order here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_self');
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

    const fetchFbConfig = async () => {
        try {
            const { data } = await supabase.from('app_settings')
                .select('*')
                .in('key', ['fb_page_id', 'fb_page_access_token']);

            const config = { pageId: '', accessToken: '' };
            data?.forEach(item => {
                if (item.key === 'fb_page_id') config.pageId = item.value;
                if (item.key === 'fb_page_access_token') config.accessToken = item.value;
            });
            setFbConfig(config);
        } catch (error) {
            console.error('Error fetching FB config:', error);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
        fetchFbConfig();
    }, []);

    if (!hasMounted) return null;

    const canPostToFacebook = () => {
        if (fbConfig?.pageId && fbConfig?.accessToken) return true;
        return false;
    }

    async function handleExcelImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonData || jsonData.length === 0) {
                setNotification({ message: '⚠️ Excel sheet appears to be empty!', type: 'error' });
                setImporting(false);
                return;
            }

            const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[\s_]/g, '');

            let successCount = 0;
            let fbSuccessCount = 0;

            for (const rawRow of jsonData) {
                try {
                    const row = {};
                    for (const k of Object.keys(rawRow)) {
                        row[normalizeKey(k)] = rawRow[k];
                    }

                    const name = row.name || row.productname || row.sareename || row.title || row.item || 'Untitled Saree';
                    const priceVal = parseFloat(row.price || row.sellingprice || row.mrp || row.rate || row.amount);
                    const price = isNaN(priceVal) ? 0 : priceVal;

                    const stockVal = parseInt(row.stock || row.quantity || row.qty || row.inventory || row.available);
                    const stock = isNaN(stockVal) ? 0 : stockVal;

                    const description = String(row.description || row.desc || row.details || row.about || row.info || '');
                    const category = String(row.category || row.collection || row.type || row.group || 'General');
                    const image_url = String(row.imageurl || row.image || row.picture || row.imagrurl || row.imglink || row.photo || '');

                    const productData = {
                        name,
                        description,
                        price,
                        category,
                        stock,
                        image_url,
                        type: 'simple',
                        total_added: stock,
                        is_active: true
                    };

                    const { data, error: insertError } = await supabase.from('products').insert([productData]).select();

                    if (insertError) {
                        console.error('Database Error for row:', name, JSON.stringify(insertError));
                        if (successCount === 0) {
                            setNotification({ message: `❌ DB Error: ${insertError.message || 'Check required fields'}`, type: 'error' });
                        }
                        continue;
                    }

                    const newProd = data?.[0];
                    if (!newProd) continue;

                    successCount++;

                    // Log history
                    if (stock > 0) {
                        await supabase.from('product_history').insert({
                            product_id: newProd.id,
                            change_type: 'ADD',
                            quantity_change: stock,
                            new_stock: stock,
                            reason: 'Bulk Excel Import'
                        });
                    }

                    // WhatsApp/Meta Catalogue Sync
                    if (syncWithMeta && canPostToFacebook() && image_url && image_url.startsWith('http')) {
                        try {
                            const fbRes = await fetch('/api/facebook/post', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    imageUrl: image_url,
                                    name,
                                    price,
                                    description,
                                    pageId: fbConfig.pageId,
                                    accessToken: fbConfig.accessToken
                                })
                            });
                            if (fbRes.ok) fbSuccessCount++;
                        } catch (metaErr) {
                            console.error('Meta sync failed for item:', name, metaErr);
                        }
                    }
                } catch (rowErr) {
                    console.error('Error processing a single row:', rowErr);
                }
            }

            if (successCount > 0) {
                const msg = syncWithMeta
                    ? `✅ Imported ${successCount} products & synced ${fbSuccessCount} with WhatsApp!`
                    : `✅ Successfully imported ${successCount} products!`;
                setNotification({ message: msg, type: 'success' });
            } else if (!notification) {
                setNotification({ message: '⚠️ Import failed. Please check column headers.', type: 'error' });
            }

            fetchProducts();
            setImportModal(false);
            setSyncWithMeta(false);

            e.target.value = '';
        } catch (err) {
            console.error('Major Excel Import Error:', err);
            setNotification({ message: '❌ Invalid file or processing failed', type: 'error' });
        } finally {
            setImporting(false);
        }
    }

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            product_group: formData.get('product_group') || null,
            description: formData.get('description'),
            type: productType,
            is_active: true
        };

        // For simple products, we take price/stock/image from main fields
        if (productType === 'simple') {
            productData.price = Number(formData.get('price'));
            productData.stock = Number(formData.get('stock'));
            productData.alert_threshold = Number(formData.get('alert_threshold') || 0);
            productData.image_url = formData.get('image') || '';
        } else {
            // For variants, we take price/stock/image from the first variant as "representative" for the list view
            if (variants.length > 0) {
                productData.price = variants[0].price;
                productData.stock = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
                productData.alert_threshold = Number(formData.get('alert_threshold') || 0);
                productData.image_url = variants[0].image_url;
            }
        }

        try {
            let savedProduct = null;
            const isNew = !currentProduct?.id;

            if (!isNew) {
                // UPDATE
                const { data, error } = await supabase.from('products').update(productData).eq('id', currentProduct.id).select();
                if (error) throw error;
                savedProduct = data?.[0];

                // Check for stock change
                const oldStock = currentProduct.stock || 0;
                const newStock = productData.stock || 0;
                if (newStock !== oldStock) {
                    const diff = newStock - oldStock;
                    await supabase.from('product_history').insert({
                        product_id: savedProduct.id,
                        change_type: diff > 0 ? 'ADD' : 'ADJUSTMENT',
                        quantity_change: diff,
                        new_stock: newStock,
                        reason: diff > 0 ? 'Manual Stock Addition' : 'Manual Stock Adjustment'
                    });
                    if (diff > 0) {
                        await supabase.rpc('increment_total_added', { prod_id: savedProduct.id, qty: diff });
                    }
                }
            } else {
                // INSERT
                // Initialize total_added with the initial stock
                const insertData = { ...productData, total_added: productData.stock || 0 };
                const { data, error } = await supabase.from('products').insert([insertData]).select();
                if (error) throw error;
                savedProduct = data?.[0];

                // Initial stock entry in history
                if (savedProduct && savedProduct.stock > 0) {
                    await supabase.from('product_history').insert({
                        product_id: savedProduct.id,
                        change_type: 'ADD',
                        quantity_change: savedProduct.stock,
                        new_stock: savedProduct.stock,
                        reason: 'Initial Stock Entry'
                    });
                }
            }

            if (productType === 'variant' && savedProduct) {
                // 1. Delete removed variants (not simple, but easy)
                await supabase.from('product_variants').delete().eq('product_id', savedProduct.id);

                // 2. Insert/Update variants
                if (variants.length > 0) {
                    const variantsToInsert = variants.map(v => ({
                        product_id: savedProduct.id,
                        name: v.name,
                        price: v.price,
                        stock: v.stock,
                        image_url: v.image_url
                    }));
                    await supabase.from('product_variants').insert(variantsToInsert);
                }
            }

            // Handle Facebook Posting
            if (postToFacebook && savedProduct && canPostToFacebook()) {
                setFbProcessing(true);
                try {
                    await fetch('/api/facebook/post', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageUrl: productData.image_url,
                            name: productData.name,
                            price: productData.price,
                            description: productData.description,
                            pageId: fbConfig.pageId,
                            accessToken: fbConfig.accessToken
                        })
                    });
                } catch (fbErr) {
                    console.error('Facebook posting failed:', fbErr);
                } finally {
                    setFbProcessing(false);
                }
            }

            fetchProducts();
            alert('✨ Product Saved Successfully!\n\n✅ Updated in Website Database\n✅ Synced with WhatsApp Catalogue');
            setIsEditing(false);
            setCurrentProduct(null);
            setVariants([]);
            setPostToFacebook(false);
        } catch (error) {
            console.error(error);
            alert('Failed to save product: ' + error.message);
        }
    };

    const openEditModal = async (product) => {
        setCurrentProduct(product);
        setProductType(product?.type || 'simple');
        if (product?.id) {
            const { data } = await supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at', { ascending: true });
            setVariants(data || []);
        } else {
            setVariants([]);
        }
        setIsEditing(true);
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', price: currentProduct?.price || 0, stock: 10, image_url: currentProduct?.image_url || '' }]);
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };


    const handleDelete = async (id) => {
        if (confirm('Delete this saree?')) {
            await supabase.from('products').delete().eq('id', id);
            fetchProducts();
        }
    };

    const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];
    const groups = ['ALL', ...new Set(products.map(p => p.product_group).filter(Boolean))];
    let filtered = products.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term) ||
            (p.product_group || '').toLowerCase().includes(term)
        ) && (categoryFilter === 'ALL' || p.category === categoryFilter)
            && (groupFilter === 'ALL' || p.product_group === groupFilter);
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
        color: 'hsl(var(--text-main))', fontFamily: 'inherit', fontSize: '0.925rem', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s'
    };

    return (
        <div className="animate-enter">
            {/* Header */}
            <div className="admin-header-row">
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Products</h1>
                    <p>Manage your premium saree collection • {products.length} items</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setImportModal(true)} className="btn btn-secondary">
                        <FileDown size={18} /> Import Excel
                    </button>
                    <button onClick={() => { setCurrentProduct(null); setProductType('simple'); setVariants([]); setIsEditing(true); }} className="btn btn-primary">
                        <Plus size={18} /> Add Product
                    </button>
                </div>
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

            {/* Group Tags Filter */}
            {groups.length > 1 && (
                <div className="admin-filter-row" style={{ marginTop: '-0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginRight: '0.5rem' }}>🏷️ Groups:</span>
                    {groups.map(grp => (
                        <button key={grp} onClick={() => setGroupFilter(grp)} style={{
                            padding: '0.35rem 0.9rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                            background: groupFilter === grp ? 'hsl(var(--accent))' : 'hsl(var(--bg-card))',
                            color: groupFilter === grp ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            border: groupFilter === grp ? '1px solid hsl(var(--accent))' : '1px solid hsl(var(--border-subtle))',
                        }}>
                            {grp === 'ALL' ? 'All Groups' : grp}
                        </button>
                    ))}
                </div>
            )}

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
                                    <th>Group</th>
                                    <th style={{ textAlign: 'right' }}>Price</th>
                                    <th style={{ textAlign: 'center' }}>Stock</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</td></tr>
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
                                        <td>
                                            {product.product_group ? (
                                                <span style={{ padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 600, background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' }}>
                                                    🏷️ {product.product_group}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.73rem', color: 'hsl(var(--text-muted) / 0.5)' }}>—</span>
                                            )}
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
                                                <button onClick={() => openEditModal(product)} className="btn btn-secondary" style={{ padding: '0.4rem' }}><Edit size={15} /></button>
                                                <button onClick={() => fetchHistory(product)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }} title="View Details">
                                                    <PackageIcon size={15} />
                                                </button>
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
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>💮</div>
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
                                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {product.category}
                                            {product.product_group && (
                                                <span style={{ padding: '1px 6px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' }}>
                                                    {product.product_group}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.95rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description || '—'}</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--primary))', marginBottom: '12px' }}>₹{(product.price || 0).toLocaleString()}</div>
                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => openEditModal(product)}
                                                className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                <Edit size={13} /> Edit
                                            </button>
                                            <button onClick={() => fetchHistory(product)} className="btn btn-secondary" style={{ padding: '0.5rem', color: 'hsl(var(--primary))' }} title="View Details">
                                                <PackageIcon size={13} />
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
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', padding: 0, border: '1px solid hsl(var(--primary) / 0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-panel))' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{currentProduct ? '✏️ Edit Saree' : '➕ Add New Saree'}</h2>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '24px', lineHeight: 1 }}>&times;</button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '1.75rem' }}>
                            {/* Product Type Toggle */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saree Type</label>
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'hsl(var(--bg-app))', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <button type="button" onClick={() => setProductType('simple')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'simple' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'simple' ? 'white' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <PackageIcon size={16} /> Simple Saree
                                    </button>
                                    <button type="button" onClick={() => setProductType('variant')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'variant' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'variant' ? 'white' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <LayoutGrid size={16} /> Variant Saree
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                    Basic Information
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Saree Name *</label>
                                        <input name="name" type="text" defaultValue={currentProduct?.name} required placeholder="e.g. Royal Kanjivaram Silk" style={inputStyle} />
                                    </div>
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
                            </div>

                            {productType === 'simple' ? (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Saree Details (Single Item)
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Price (₹) *</label>
                                            <input type="number" name="price" defaultValue={currentProduct?.price} required placeholder="e.g. 12500" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Stock Qty *</label>
                                            <input type="number" name="stock" defaultValue={currentProduct?.stock} required placeholder="e.g. 10" style={inputStyle} />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Image URL (WhatsApp display)</label>
                                            <input name="image" defaultValue={currentProduct?.image_url} placeholder="https://..." style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} placeholder="e.g. 5" style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Manage Variants (Multiple Colors/Options)
                                    </h3>
                                    <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Create different versions of this saree:</span>
                                            <button type="button" onClick={addVariant} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.2)' }}>
                                                <Plus size={14} /> Add Variant
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {variants.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', marginBottom: '-0.25rem', padding: '0 2px' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color/Option</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price (₹)</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image URL</div>
                                                    <div style={{ width: '20px' }}></div>
                                                </div>
                                            )}
                                            {variants.map((v, i) => (
                                                <div key={i} className="animate-in fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'center' }}>
                                                    <input placeholder="Red/Silk" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} style={{ ...inputStyle, padding: '0.5rem' }} />
                                                    <input type="number" placeholder="0" value={v.price} onChange={e => updateVariant(i, 'price', Number(e.target.value))} style={{ ...inputStyle, padding: '0.5rem' }} />
                                                    <input type="number" placeholder="0" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} style={{ ...inputStyle, padding: '0.5rem' }} />
                                                    <input placeholder="Link..." value={v.image_url} onChange={e => updateVariant(i, 'image_url', e.target.value)} style={{ ...inputStyle, padding: '0.5rem' }} />
                                                    <button type="button" onClick={() => removeVariant(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--danger) / 0.1)', border: 'none', color: 'hsl(var(--danger))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--danger) / 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'hsl(var(--danger) / 0.1)'}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {variants.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', border: '1px dashed hsl(var(--border-subtle))', borderRadius: '12px' }}>
                                                    No variants added yet. Click <strong>"Add Variant"</strong> to start.
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold (Overall)</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} placeholder="e.g. 5" style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Description</label>
                                <textarea name="description" defaultValue={currentProduct?.description} rows={3}
                                    style={{ ...inputStyle, resize: 'vertical' }} placeholder="Fabric, colors, design details..." />
                            </div>
                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>🏷️ Product Group / Tag</label>
                                <input name="product_group" defaultValue={currentProduct?.product_group || ''} placeholder="e.g. Festive2026, NewArrivals, BridalSeason" style={inputStyle} />
                            </div>

                            {/* Facebook Integration */}
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            <Share2 size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Facebook Meta Integration</div>
                                            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Auto-post to your business page</div>
                                        </div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={postToFacebook} onChange={e => setPostToFacebook(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: postToFacebook ? '#1877F2' : '#ccc', transition: '.4s', borderRadius: '20px' }}>
                                            <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: postToFacebook ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                        </span>
                                    </label>
                                </div>

                                {postToFacebook && !fbConfig.pageId && (
                                    <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'hsl(var(--danger))', background: 'hsl(var(--danger) / 0.1)', padding: '8px', borderRadius: '6px' }}>
                                        ⚠️ Facebook account not linked. <button type="button" onClick={() => router.push('/admin/facebook')} style={{ background: 'none', border: 'none', color: '#1877F2', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Connect Account</button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={fbProcessing}>
                                    {fbProcessing ? (
                                        <><Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} /> Posting...</>
                                    ) : (
                                        <>💾 Save Saree {postToFacebook ? '& Post' : ''}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* ─── STOCK HISTORY MODAL ─── */}
            {showHistory && selectedProductForHistory && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowHistory(false)}>
                    <div onClick={e => e.stopPropagation()} className="card shadow-premium" style={{ width: '600px', maxHeight: '80vh', overflow: 'hidden', padding: 0, border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-panel))' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>📊 Stock History</h2>
                                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>{selectedProductForHistory.name}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '24px' }}>&times;</button>
                        </div>

                        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>{selectedProductForHistory.total_added || selectedProductForHistory.stock}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Processed</div>
                                </div>
                                <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{selectedProductForHistory.total_sold || 0}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sold</div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>Recent Activity Log</h3>

                            {historyLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} /></div>
                            ) : historyData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))', background: 'hsl(var(--bg-app))', borderRadius: '12px', border: '1px dashed hsl(var(--border-subtle))' }}>
                                    No history records found for this product.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {historyData.map((h, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '10px',
                                                    background: h.change_type === 'SALE' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                                    color: h.change_type === 'SALE' ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem'
                                                }}>
                                                    {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{h.reason || (h.change_type === 'SALE' ? 'Customer Purchase' : 'Inventory Update')}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>NEW STOCK</div>
                                                <div style={{ fontWeight: 800 }}>{h.new_stock}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {importModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '450px', padding: '2rem', border: '1px solid hsl(var(--primary) / 0.3)', textAlign: 'center' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'hsl(var(--primary) / 0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem', color: 'hsl(var(--primary))' }}>
                                <Upload size={30} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Bulk Import Catalog</h2>
                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>Upload your inventory spreadsheet to add sarees in bulk.</p>
                        </div>

                        <div style={{ background: 'hsl(var(--bg-app))', borderRadius: '15px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid hsl(var(--border-subtle))', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', marginBottom: '0.75rem' }}>Optional Settings</h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Sync with Meta Catalogue</div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Auto-post items to Facebook/WhatsApp shop</div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={syncWithMeta} onChange={e => setSyncWithMeta(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: syncWithMeta ? 'hsl(var(--primary))' : '#333', transition: '.4s', borderRadius: '20px' }}>
                                        <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: syncWithMeta ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                key={`file-import-${Date.now()}`}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                id="bulk-import-input"
                                style={{ display: 'none' }}
                                onChange={handleExcelImport}
                            />
                            <label htmlFor="bulk-import-input" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                padding: '1rem', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                                borderRadius: '12px', color: 'white', fontWeight: 800, cursor: 'pointer', transition: '0.2s'
                            }}>
                                {importing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><FileDown size={18} /> Select Excel File</>}
                            </label>
                            <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 3000,
                    padding: '1.25rem 2rem', borderRadius: '16px',
                    background: notification.type === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--success))',
                    color: 'white', fontWeight: 800, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {notification.type === 'error' ? '❌' : '✅'} {notification.message}
                    <button onClick={() => setNotification(null)} style={{ marginLeft: '1rem', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>&times;</button>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}

