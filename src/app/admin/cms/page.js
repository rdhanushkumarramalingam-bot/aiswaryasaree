'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, FileText, Check, X,
    Eye, EyeOff, ExternalLink, Globe, Layout, ArrowLeft,
    Settings, Image as ImageIcon, Code, BarChart, Calendar, Lock,
    ChevronRight, Save, Copy, Monitor, Smartphone, Tablet
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const TABS = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'seo', label: 'SEO Suite', icon: BarChart },
    { id: 'appearance', label: 'Appearance', icon: ImageIcon },
    { id: 'advanced', label: 'Advanced', icon: Code },
];

export default function CMSPage() {
    const router = useRouter();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('content');
    const [saving, setSaving] = useState(false);

    const fetchPages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cms_pages')
                .select('*')
                .order('menu_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Error fetching CMS pages:', error);
            showNotification('Failed to fetch pages', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        const form = document.querySelector('#cms-page-form');
        const formData = new FormData(form);

        const pageData = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            content: formData.get('content'),
            is_published: formData.get('status') === 'published',
            status: formData.get('status'),
            visibility: formData.get('visibility'),
            template: formData.get('template'),
            menu_order: parseInt(formData.get('menu_order') || '0'),
            meta_description: formData.get('meta_description'),
            seo_title: formData.get('seo_title'),
            og_image: formData.get('og_image'),
            featured_image: formData.get('featured_image'),
            custom_css: formData.get('custom_css'),
            custom_js: formData.get('custom_js'),
            parent_id: formData.get('parent_id') === 'none' ? null : formData.get('parent_id'),
            publish_date: formData.get('publish_date') ? new Date(formData.get('publish_date')).toISOString() : new Date().toISOString()
        };

        try {
            if (currentPage?.id) {
                const { error } = await supabase.from('cms_pages').update(pageData).eq('id', currentPage.id);
                if (error) throw error;
                showNotification('Page updated successfully!');
            } else {
                const { error } = await supabase.from('cms_pages').insert([pageData]);
                if (error) throw error;
                showNotification('New page created! ✨');
            }
            setIsEditing(false);
            setCurrentPage(null);
            setActiveTab('content');
            fetchPages();
        } catch (error) {
            console.error('Save Error:', error);
            showNotification(error.message || 'Failed to save page', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('🚨 Are you sure you want to delete this page? This will permanentely remove all its content and SEO data.')) return;
        try {
            const { error } = await supabase.from('cms_pages').delete().eq('id', id);
            if (error) throw error;
            showNotification('Page archived successfully');
            fetchPages();
        } catch (error) {
            console.error('Delete Error:', error);
            showNotification('Archiving failed', 'error');
        }
    };

    const generateSlug = (title) => {
        return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    };

    const filteredPages = pages.filter(page =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // CSS variables & styles
    const inputStyle = {
        width: '100%', padding: '0.85rem', borderRadius: '12px',
        background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontSize: '0.95rem', outline: 'none',
        boxSizing: 'border-box', transition: 'all 0.2s', marginBottom: '1rem'
    };

    const labelStyle = {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.6rem', fontSize: '0.82rem', fontWeight: 700,
        color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em'
    };

    return (
        <div className="animate-enter" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Action Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 9999,
                    background: notification.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white', padding: '1.25rem 2rem', borderRadius: '16px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease',
                    display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600
                }}>
                    {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
                    {notification.message}
                </div>
            )}

            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2.25rem', fontWeight: 800 }}>
                        <Layout size={32} color="hsl(var(--primary))" />
                        CMS Pages
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem' }}>Ultimate Store Content Management • {pages.length} Pages Managed</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => { setCurrentPage(null); setIsEditing(true); setActiveTab('content'); }}
                        className="btn btn-primary"
                        style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', boxShadow: '0 8px 20px hsl(var(--primary) / 0.3)' }}
                    >
                        <Plus size={20} /> Add New Page
                    </button>
                </div>
            </div>

            {/* Main Listing View */}
            <div className="card shadow-premium" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel)/0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                        <input
                            type="text"
                            placeholder="Find pages by title, slug, or content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '3rem', marginBottom: 0, background: 'hsl(var(--bg-card))' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '8rem 0', textAlign: 'center' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 1.5rem' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Hydrating content engine...</p>
                    </div>
                ) : filteredPages.length === 0 ? (
                    <div style={{ padding: '6rem 3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                        <h3 style={{ fontSize: '1.5rem' }}>No pages found</h3>
                        <p style={{ color: 'hsl(var(--text-muted))' }}>{searchTerm ? 'Try adjusting your search filters' : 'Start building your store content by adding your first page!'}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                            <thead style={{ background: 'hsl(var(--bg-panel)/0.8)' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Structure & Title</th>
                                    <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Endpoint</th>
                                    <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                                    <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Template</th>
                                    <th style={{ textAlign: 'right', padding: '1.25rem 2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPages.map((page, idx) => (
                                    <tr key={page.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle))', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--bg-panel)/0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1.5rem 2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '44px', height: '44px', borderRadius: '12px',
                                                    background: page.is_published ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--bg-app))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <FileText size={20} color={page.is_published ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'hsl(var(--text-main))' }}>{page.title}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                                        {page.parent_id ? `↳ Sub-page of ${pages.find(p => p.id === page.parent_id)?.title || '...'}` : 'Root Level Page'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.5rem' }}>
                                            <code style={{ background: 'hsl(var(--bg-app))', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>/page/{page.slug}</code>
                                        </td>
                                        <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.72rem', fontWeight: 800,
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                background: page.status === 'published' ? 'hsl(var(--success)/0.15)' : page.status === 'scheduled' ? 'hsl(var(--accent)/0.15)' : 'hsl(var(--bg-app))',
                                                color: page.status === 'published' ? 'hsl(var(--success))' : page.status === 'scheduled' ? 'hsl(var(--accent))' : 'hsl(var(--text-muted))',
                                                border: `1px solid ${page.status === 'published' ? 'hsl(var(--success)/0.3)' : 'hsl(var(--text-muted)/0.3)'}`
                                            }}>
                                                {page.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                                <ImageIcon size={14} /> {page.template || 'default'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => { setCurrentPage(page); setIsEditing(true); setActiveTab('content'); }}
                                                    className="btn-icon"
                                                    title="Refine Page"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(page.id)}
                                                    className="btn-icon danger"
                                                    title="Destroy Page"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <a
                                                    href={`/page/${page.slug}`}
                                                    target="_blank"
                                                    className="btn-icon primary"
                                                    title="Simulate Content View"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Advanced WooCommerce-Style Editor Modal */}
            {isEditing && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div style={{
                        background: 'hsl(var(--bg-card))', width: '100%', maxWidth: '1100px',
                        borderRadius: '32px', display: 'flex', flexDirection: 'column', height: '90vh',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6)', border: '1px solid hsl(var(--border-subtle))',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-panel)/0.4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <ImageIcon size={28} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{currentPage ? `Editing Content: ${currentPage.title}` : 'Design New Experience'}</h2>
                                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                                        {currentPage ? `Last refined on ${new Date(currentPage.updated_at).toLocaleString()}` : 'Configuring initial content structure'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '14px' }}>
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {currentPage ? 'Apply Changes' : 'Initialize Page'}
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setActiveTab('content'); }}
                                    style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Navigation (Tabs) */}
                        <div style={{ display: 'flex', background: 'hsl(var(--bg-panel)/0.2)', borderBottom: '1px solid hsl(var(--border-subtle))', padding: '0 1rem' }}>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '1.25rem 2.5rem', border: 'none', background: 'transparent', cursor: 'pointer',
                                        fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                        borderBottom: `3px solid ${activeTab === tab.id ? 'hsl(var(--primary))' : 'transparent'}`,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <tab.icon size={18} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body (Forms) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem' }} id="cms-editor-body">
                            <form id="cms-page-form" style={{ maxWidth: '900px', margin: '0 auto' }}>

                                {activeTab === 'content' && (
                                    <div className="animate-fade">
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
                                            <div>
                                                <label style={labelStyle}>Primary Title</label>
                                                <input name="title" required placeholder="Enter compelling title..." defaultValue={currentPage?.title} onChange={(e) => { if (!currentPage) document.querySelector('input[name="slug"]').value = generateSlug(e.target.value); }} style={{ ...inputStyle, fontSize: '1.5rem', fontWeight: 700, padding: '1rem 1.25rem' }} />

                                                <label style={labelStyle}>Body Content (Engine Workspace)</label>
                                                <textarea name="content" required rows={18} placeholder="Draft your content with HTML or raw text..." defaultValue={currentPage?.content} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.6, minHeight: '400px', padding: '1.25rem' }} />
                                            </div>

                                            <div>
                                                <div className="card" style={{ padding: '1.5rem', background: 'hsl(var(--bg-panel)/0.4)', borderRadius: '20px' }}>
                                                    <label style={labelStyle}><Globe size={14} /> URL Segment (Slug)</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>/page/</span>
                                                        <input name="slug" required defaultValue={currentPage?.slug} style={{ ...inputStyle, marginBottom: 0, padding: '0.5rem' }} />
                                                    </div>

                                                    <label style={labelStyle}><Lock size={14} /> Page Status</label>
                                                    <select name="status" defaultValue={currentPage?.status || 'draft'} style={inputStyle}>
                                                        <option value="draft">Draft - Private</option>
                                                        <option value="published">Published - Live</option>
                                                        <option value="scheduled">Scheduled - Future</option>
                                                    </select>

                                                    <label style={labelStyle}><Eye size={14} /> Visibility</label>
                                                    <select name="visibility" defaultValue={currentPage?.visibility || 'public'} style={inputStyle}>
                                                        <option value="public">🌍 Public (SEO Ready)</option>
                                                        <option value="private">🔒 Private (Admin Only)</option>
                                                    </select>

                                                    <label style={labelStyle}><Calendar size={14} /> Publish Date</label>
                                                    <input type="datetime-local" name="publish_date" defaultValue={currentPage?.publish_date ? new Date(currentPage.publish_date).toISOString().slice(0, 16) : ''} style={inputStyle} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'seo' && (
                                    <div className="animate-fade">
                                        <div style={{ background: 'hsl(var(--bg-panel)/0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h3 style={{ marginTop: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                🔍 SEO & Discoverability Suite
                                            </h3>

                                            <label style={labelStyle}>Browser Meta Title (Optimal: 60 chars)</label>
                                            <input name="seo_title" placeholder="Leave empty to use page title" defaultValue={currentPage?.seo_title} style={inputStyle} />

                                            <label style={labelStyle}>Search Engine Description (Optimal: 155 chars)</label>
                                            <textarea name="meta_description" rows={4} placeholder="Summarize your page for Google search results..." defaultValue={currentPage?.meta_description} style={{ ...inputStyle, minHeight: '100px' }} />

                                            <label style={labelStyle}>Social Sharing Image (OpenGraph URL)</label>
                                            <input name="og_image" placeholder="https://image-url-for-whatsapp-fb.jpg" defaultValue={currentPage?.og_image} style={inputStyle} />

                                            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#1a202c' }}>
                                                <div style={{ fontSize: '0.8rem', color: '#1a73e8', marginBottom: '0.25rem' }}>www.aiswaryasaree.com/page/{currentPage?.slug || 'preview'}</div>
                                                <div style={{ fontSize: '1.2rem', color: '#1a0dab', fontWeight: 600, marginBottom: '0.25rem' }}>{currentPage?.seo_title || currentPage?.title || 'SEO Title Preview'}</div>
                                                <div style={{ fontSize: '0.875rem', color: '#4d5156', lineHeight: 1.4 }}>{currentPage?.meta_description || 'Page meta description will appear here in search results. Make it catchy!'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'appearance' && (
                                    <div className="animate-fade">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                                            <div>
                                                <label style={labelStyle}>Layout Template</label>
                                                <select name="template" defaultValue={currentPage?.template || 'default'} style={inputStyle}>
                                                    <option value="default">Default Standard Layout</option>
                                                    <option value="home">Homepage Style (Full Width)</option>
                                                    <option value="landing">Landing Page (No Header/Footer)</option>
                                                    <option value="wide">Wide Sidebar Layout</option>
                                                </select>

                                                <label style={labelStyle}>Featured Media (Cover Image)</label>
                                                <input name="featured_image" placeholder="https://image-url" defaultValue={currentPage?.featured_image} style={inputStyle} />

                                                {currentPage?.featured_image && (
                                                    <img src={currentPage.featured_image} alt="Preview" style={{ width: '100%', borderRadius: '12px', height: '200px', objectFit: 'cover', marginTop: '1rem', border: '1px solid hsl(var(--border-subtle))' }} />
                                                )}
                                            </div>

                                            <div>
                                                <label style={labelStyle}>Hierarchy (Parent Page)</label>
                                                <select name="parent_id" defaultValue={currentPage?.parent_id || 'none'} style={inputStyle}>
                                                    <option value="none">No Parent (Main Level)</option>
                                                    {pages.filter(p => p.id !== currentPage?.id).map(p => (
                                                        <option key={p.id} value={p.id}>{p.title}</option>
                                                    ))}
                                                </select>

                                                <label style={labelStyle}>Navigation Order (Low to High)</label>
                                                <input type="number" name="menu_order" defaultValue={currentPage?.menu_order || 0} style={inputStyle} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'advanced' && (
                                    <div className="animate-fade">
                                        <div style={{ display: 'grid', gap: '2rem' }}>
                                            <div className="card" style={{ padding: '2rem', background: '#0f172a', borderRadius: '24px' }}>
                                                <label style={{ ...labelStyle, color: '#94a3b8' }}><ImageIcon size={14} /> Global Style Override (CSS)</label>
                                                <textarea name="custom_css" rows={8} defaultValue={currentPage?.custom_css} style={{ ...inputStyle, background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontFamily: 'monospace' }} placeholder=".hero { background: pink; }" />
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Inject custom CSS scoping only for this specific page.</p>
                                            </div>

                                            <div className="card" style={{ padding: '2rem', background: '#0f172a', borderRadius: '24px' }}>
                                                <label style={{ ...labelStyle, color: '#94a3b8' }}><Settings size={14} /> Logic Runtime Script (JS)</label>
                                                <textarea name="custom_js" rows={8} defaultValue={currentPage?.custom_js} style={{ ...inputStyle, background: '#1e293b', border: '1px solid #334155', color: '#facc15', fontFamily: 'monospace' }} placeholder="console.log('Page loaded');" />
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Run custom JavaScript functionality when this page is visited.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideIn { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-enter { animation: fade 0.4s ease-out; }
                .animate-fade { animation: fade 0.3s ease-out; }
                .animate-spin { animation: spin 1s linear infinite; }
                
                .shadow-premium {
                    box-shadow: 0 20px 60px -15px rgba(0,0,0,0.1), 0 10px 30px -10px rgba(0,0,0,0.05);
                }
                
                .btn-icon {
                    width: 42px; height: 42px; border-radius: 12px; border: 1px solid hsl(var(--border-subtle));
                    background: transparent; cursor: pointer; display: flex; alignItems: center; justifyContent: center;
                    transition: all 0.2s; color: hsl(var(--text-muted));
                }
                .btn-icon:hover { background: hsl(var(--bg-panel)); color: hsl(var(--text-main)); border-color: hsl(var(--primary)/0.5); }
                .btn-icon.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }
                .btn-icon.primary:hover { background: hsl(var(--primary)/0.1); color: hsl(var(--primary)); border-color: hsl(var(--primary)/0.4); }
                
                input:focus, textarea:focus, select:focus {
                    border-color: hsl(var(--primary)) !important;
                    box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
                }
            `}</style>
        </div>
    );
}
