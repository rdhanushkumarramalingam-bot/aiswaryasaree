'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../page.module.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WhatsAppSettingsPage() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        fetchSettings();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        const { data, error } = await supabase.from('app_settings').select('*');
        if (data) setSettings(data);
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        for (const s of settings) {
            await supabase.from('app_settings').upsert({ key: s.key, value: s.value, description: s.description });
        }
        setSaving(false);
        alert('Settings Saved!');
    }

    function handleChange(key, value) {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    }

    if (!hasMounted) return null;

    if (loading) return <div className="safe-loading"><p>Loading settings...</p></div>;

    const groupStart = settings.find(s => s.key.includes('welcome')) ? 'Welcome Flow' : 'General';

    return (
        <div className="animate-enter">
            <div className="admin-header-row">
                <div>
                    <h1 className={styles.pageTitle}>WhatsApp Funnel Config</h1>
                    <p style={{ color: 'hsl(var(--text-muted))' }}>Customize the messages sent by your WhatsApp Bot.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)',
                        background: 'hsl(var(--primary))', color: 'white',
                        border: 'none', fontWeight: 600, cursor: saving ? 'wait' : 'pointer'
                    }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
                {settings.length === 0 && <p>No settings found. Please run the setup script.</p>}

                {settings.map(setting => (
                    <div key={setting.key} style={{
                        background: 'hsl(var(--bg-card))', padding: '1.5rem',
                        borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border-subtle))'
                    }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                            {setting.key.replace('wa_', '').replace(/_/g, ' ').toUpperCase()}
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>
                            {setting.description}
                        </p>

                        {setting.key.includes('image') ? (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={setting.value}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)',
                                        border: '1px solid hsl(var(--border-bright))',
                                        background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))'
                                    }}
                                />
                                {setting.value && <img src={setting.value} alt="Preview" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />}
                            </div>
                        ) : (
                            <textarea
                                value={setting.value}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                rows={4}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)',
                                    border: '1px solid hsl(var(--border-bright))',
                                    background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))',
                                    fontFamily: 'monospace'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
