'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Truck, Save, Plus, Trash2, Globe, MapPin,
    AlertCircle, CheckCircle2, Loader2, Info,
    Search, LayoutGrid, List, ChevronRight,
    Tag, Map as MapIcon, ChevronDown, PlusCircle
} from 'lucide-react';

export default function ShippingAdminPage() {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedZone, setSelectedZone] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [mappings, setMappings] = useState([]); // Array of {zone_id, state_name, district_name}

    const allStates = useMemo(() => [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry",
        "Jammu and Kashmir", "Ladakh"
    ].sort(), []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: zonesData } = await supabase
                .from('shipping_zones')
                .select('*')
                .order('is_international', { ascending: true })
                .order('name', { ascending: true });

            const { data: mappingData } = await supabase
                .from('shipping_zone_states')
                .select('*');

            if (zonesData) {
                setZones(zonesData);
                if (!selectedZone && zonesData.length > 0) setSelectedZone(zonesData[0]);
                else if (selectedZone) {
                    const updated = zonesData.find(z => z.id === selectedZone.id);
                    if (updated) setSelectedZone(updated);
                }
            }
            if (mappingData) setMappings(mappingData);

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load shipping data.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateZone = (id, field, value) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
        if (selectedZone?.id === id) {
            setSelectedZone(prev => ({ ...prev, [field]: value }));
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            // 1. Update Zones
            for (const zone of zones) {
                const { error: updateError } = await supabase
                    .from('shipping_zones')
                    .update({
                        name: zone.name,
                        rate: parseFloat(zone.rate),
                        free_threshold: parseFloat(zone.free_threshold),
                        is_international: zone.is_international
                    })
                    .eq('id', zone.id);
                if (updateError) throw updateError;
            }

            // 2. Update Mappings
            // Truncate and rewrite for simplicity (safe given small data size)
            const zoneIds = zones.map(z => z.id);
            if (zoneIds.length > 0) {
                await supabase.from('shipping_zone_states').delete().in('zone_id', zoneIds);
                if (mappings.length > 0) {
                    const { error: insError } = await supabase.from('shipping_zone_states').insert(mappings.map(m => ({
                        zone_id: m.zone_id,
                        state_name: m.state_name,
                        district_name: m.district_name || null
                    })));
                    if (insError) throw insError;
                }
            }

            setSuccess('Shipping settings synchronized successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const addZone = async () => {
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('shipping_zones')
                .insert([{ name: 'New Price Group', rate: 100, free_threshold: 5000, is_international: false }])
                .select()
                .single();

            if (error) throw error;
            setZones([...zones, data]);
            setSelectedZone(data);
            setSuccess('New zone created!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteZone = async (id) => {
        if (!confirm('Permanently delete this zone?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
            if (error) throw error;
            const remaining = zones.filter(z => z.id !== id);
            setZones(remaining);
            setMappings(mappings.filter(m => m.zone_id !== id));
            if (selectedZone?.id === id) setSelectedZone(remaining[0] || null);
            setSuccess('Zone removed.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addLocation = (state) => {
        if (!selectedZone) return;
        // Check if already in this zone
        const exists = mappings.find(m => m.zone_id === selectedZone.id && m.state_name === state && !m.district_name);
        if (exists) return;

        // Remove from other zones if it's a global state mapping
        const filtered = mappings.filter(m => !(m.state_name === state && !m.district_name));
        setMappings([...filtered, { zone_id: selectedZone.id, state_name: state, district_name: null }]);
    };

    const addDistrict = (state, district) => {
        if (!selectedZone || !district) return;
        // Specific override should be allowed in only one zone
        const filtered = mappings.filter(m => !(m.state_name === state && m.district_name === district));
        setMappings([...filtered, { zone_id: selectedZone.id, state_name: state, district_name: district }]);
    };

    const removeMapping = (index) => {
        setMappings(prev => prev.filter((_, i) => i !== index));
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" color="hsl(var(--primary))" />
            <p style={{ color: 'hsl(var(--text-muted))' }}>Loading shipping engine...</p>
        </div>
    );

    return (
        <div className="shipping-page animate-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1><Truck /> Shipping Zones</h1>
                    <p>Configure regional delivery pricing and global shipping rules.</p>
                </div>
                <button onClick={saveChanges} disabled={saving} className="btn-primary-glow">
                    {saving ? <Loader2 className="animate-spin" /> : <Save />} Save Configurations
                </button>
            </div>

            {/* Notifications */}
            {error && <div className="toast toast-error"><AlertCircle /> {error}</div>}
            {success && <div className="toast toast-success"><CheckCircle2 /> {success}</div>}

            <div className="shipping-grid">
                {/* Sidebar: Zones List */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <h3>Price Groups</h3>
                        <button onClick={addZone} className="btn-add-icon"><Plus size={18} /></button>
                    </div>
                    <div className="zone-list">
                        {zones.map(zone => (
                            <div
                                key={zone.id}
                                onClick={() => setSelectedZone(zone)}
                                className={`zone-item ${selectedZone?.id === zone.id ? 'active' : ''}`}
                            >
                                <div className="zone-info">
                                    <div className="zone-name">{zone.name}</div>
                                    <div className="zone-meta">
                                        {zone.is_international ? 'International' : `${mappings.filter(m => m.zone_id === zone.id).length} regions`}
                                        {' • '} ₹{zone.rate}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="chevron" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main: Zone Detail Editor */}
                <div className="main-editor">
                    {selectedZone ? (
                        <div className="editor-card card shadow-premium">
                            <div className="editor-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div className="icon-badge">
                                        {selectedZone.is_international ? <Globe /> : <MapPin />}
                                    </div>
                                    <input
                                        className="h2-input"
                                        value={selectedZone.name}
                                        onChange={(e) => handleUpdateZone(selectedZone.id, 'name', e.target.value)}
                                    />
                                </div>
                                <button onClick={() => deleteZone(selectedZone.id)} className="btn-danger-icon">
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="config-grid">
                                <div className="field-group">
                                    <label><Truck size={14} /> Shipping Rate</label>
                                    <div className="input-with-label">
                                        <span>₹</span>
                                        <input
                                            type="number"
                                            value={selectedZone.rate}
                                            onChange={(e) => handleUpdateZone(selectedZone.id, 'rate', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label><Tag size={14} /> Free Above (Threshold)</label>
                                    <div className="input-with-label">
                                        <span>₹</span>
                                        <input
                                            type="number"
                                            value={selectedZone.free_threshold}
                                            onChange={(e) => handleUpdateZone(selectedZone.id, 'free_threshold', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>Zone Type</label>
                                    <div className="btn-toggle-group">
                                        <button
                                            onClick={() => handleUpdateZone(selectedZone.id, 'is_international', false)}
                                            className={!selectedZone.is_international ? 'active' : ''}
                                        >Domestic</button>
                                        <button
                                            onClick={() => handleUpdateZone(selectedZone.id, 'is_international', true)}
                                            className={selectedZone.is_international ? 'active' : ''}
                                        >International</button>
                                    </div>
                                </div>
                            </div>

                            {!selectedZone.is_international && (
                                <div className="destination-manager">
                                    <div className="section-header">
                                        <h3><MapIcon size={18} /> Assigned Locations</h3>
                                        <p>Orders from these regions will use this rate.</p>
                                    </div>

                                    <div className="location-list">
                                        <table className="location-table">
                                            <thead>
                                                <tr>
                                                    <th>State</th>
                                                    <th>District / City Overrides</th>
                                                    <th style={{ width: '50px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mappings.filter(m => m.zone_id === selectedZone.id).map((m, idx) => (
                                                    <tr key={idx}>
                                                        <td><strong>{m.state_name}</strong></td>
                                                        <td>
                                                            {m.district_name ? (
                                                                <span className="district-tag">{m.district_name}</span>
                                                            ) : (
                                                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Entire State</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => {
                                                                    const realIdx = mappings.indexOf(m);
                                                                    removeMapping(realIdx);
                                                                }}
                                                                className="btn-remove"
                                                            ><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {mappings.filter(m => m.zone_id === selectedZone.id).length === 0 && (
                                                    <tr><td colSpan={3} className="empty-msg">No locations assigned to this zone yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="add-controls">
                                        <h4>Add New Region</h4>
                                        <div className="control-row">
                                            <div className="select-box">
                                                <select id="state-selector" className="modern-select">
                                                    <option value="">Select State...</option>
                                                    {allStates.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <input id="district-input" className="modern-input" placeholder="Specific District (Optional)" />
                                            <button
                                                onClick={() => {
                                                    const s = document.getElementById('state-selector').value;
                                                    const d = document.getElementById('district-input').value;
                                                    if (!s) return;
                                                    if (d) addDistrict(s, d);
                                                    else addLocation(s);
                                                    document.getElementById('district-input').value = '';
                                                }}
                                                className="btn-add-loc"
                                            >
                                                <Plus size={16} /> Add to Zone
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedZone.is_international && (
                                <div className="intl-notice">
                                    <Globe size={48} />
                                    <h3>Global Coverage</h3>
                                    <p>As the international zone, this rate will apply to any address outside of India.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <LayoutGrid size={48} />
                            <h3>Select a Price Group</h3>
                            <p>Choose a zone from the sidebar to edit its shipping rules.</p>
                        </div>
                    )}

                    <div className="pro-tips">
                        <Info size={18} />
                        <div>
                            <strong>Priority Rules:</strong> Specific District rates always take priority over State rates.
                            Domestic rates apply within India based on the shipping address. International rate applies globally.
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .shipping-page { padding: 2rem; max-width: 1400px; margin: 0 auto; color: #fff; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; marginBottom: 3rem; }
                .page-header h1 { font-size: 2.5rem; display: flex; align-items: center; gap: 1rem; margin: 0; }
                .page-header p { color: hsl(var(--text-muted)); margin: 0.5rem 0 0; }
                
                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none;
                    padding: 1rem 2rem; borderRadius: 12px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
                    box-shadow: 0 0 20px hsl(var(--primary) / 0.3); transition: 0.3s;
                }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 0 30px hsl(var(--primary) / 0.5); }

                .shipping-grid { display: grid; gridTemplateColumns: 320px 1fr; gap: 2rem; margin-top: 2rem; }
                
                .sidebar { background: hsl(var(--bg-panel)); border-radius: 20px; border: 1px solid hsl(var(--border-subtle)); overflow: hidden; height: fit-content; }
                .sidebar-header { padding: 1.5rem; border-bottom: 1px solid hsl(var(--border-subtle)); display: flex; justify-content: space-between; align-items: center; }
                .sidebar-header h3 { margin: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; color: hsl(var(--text-muted)); }
                
                .zone-list { padding: 0.5rem; }
                .zone-item { 
                    padding: 1.25rem; border-radius: 12px; cursor: pointer; position: relative;
                    display: flex; align-items: center; justify-content: space-between; transition: 0.2s;
                }
                .zone-item:hover { background: rgba(255,255,255,0.05); }
                .zone-item.active { background: hsl(var(--primary) / 0.15); border: 1px solid hsl(var(--primary) / 0.3); }
                .zone-name { font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
                .zone-meta { font-size: 0.8rem; color: hsl(var(--text-muted)); }
                .chevron { color: hsl(var(--text-muted)); opacity: 0.5; }

                .editor-card { padding: 2.5rem; }
                .editor-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; border-bottom: 1px solid hsl(var(--border-subtle)); padding-bottom: 1.5rem; }
                .icon-badge { width: 48px; height: 48px; background: hsl(var(--primary) / 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: hsl(var(--primary)); }
                .h2-input { background: none; border: none; font-size: 2rem; font-weight: 800; color: #fff; outline: none; flex: 1; }
                .h2-input:focus { color: hsl(var(--primary)); }

                .config-grid { display: grid; gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 3rem; }
                .field-group { display: flex; flexDirection: column; gap: 0.75rem; }
                .field-group label { font-size: 0.75rem; font-weight: 700; color: hsl(var(--text-muted)); display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; }
                .input-with-label { position: relative; display: flex; align-items: center; }
                .input-with-label span { position: absolute; left: 1rem; font-weight: 800; color: hsl(var(--primary)); }
                .input-with-label input { width: 100%; padding: 1rem 1rem 1rem 2.5rem; background: hsl(var(--bg-app)); border: 1px solid hsl(var(--border-subtle)); border-radius: 12px; color: #fff; font-size: 1.1rem; font-weight: 700; outline: none; }
                .input-with-label input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 15px hsl(var(--primary) / 0.1); }

                .btn-toggle-group { display: flex; background: hsl(var(--bg-app)); padding: 0.4rem; border-radius: 12px; border: 1px solid hsl(var(--border-subtle)); }
                .btn-toggle-group button { flex: 1; padding: 0.6rem; border: none; background: none; color: hsl(var(--text-muted)); font-weight: 700; font-size: 0.85rem; border-radius: 8px; cursor: pointer; transition: 0.3s; }
                .btn-toggle-group button.active { background: hsl(var(--primary)); color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

                .destination-manager { background: rgba(255,255,255,0.02); border-radius: 20px; padding: 2rem; border: 1px solid hsl(var(--border-subtle)); }
                .section-header h3 { margin: 0; display: flex; align-items: center; gap: 0.75rem; }
                .section-header p { color: hsl(var(--text-muted)); font-size: 0.9rem; margin: 0.5rem 0 1.5rem; }

                .location-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
                .location-table th { text-align: left; font-size: 0.7rem; color: hsl(var(--text-muted)); text-transform: uppercase; padding: 1rem; border-bottom: 2px solid hsl(var(--border-subtle)); }
                .location-table td { padding: 1.25rem 1rem; border-bottom: 1px solid hsl(var(--border-subtle)); }
                .district-tag { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.8rem; font-weight: 700; border: 1px solid hsl(var(--primary) / 0.2); }
                .btn-remove { background: none; border: none; color: hsl(var(--danger)); cursor: pointer; opacity: 0.5; transition: 0.2s; }
                .btn-remove:hover { opacity: 1; transform: scale(1.1); }
                .empty-msg { text-align: center; color: hsl(var(--text-muted)); padding: 3rem !important; }

                .add-controls { background: hsl(var(--bg-app)); padding: 1.5rem; border-radius: 15px; border: 1px dashed hsl(var(--border-subtle)); }
                .add-controls h4 { margin: 0 0 1rem; font-size: 0.85rem; }
                .control-row { display: grid; gridTemplateColumns: 1fr 1fr 180px; gap: 1rem; }
                .modern-select, .modern-input { width: 100%; padding: 0.75rem 1rem; background: hsl(var(--bg-panel)); border: 1px solid hsl(var(--border-subtle)); border-radius: 10px; color: #fff; outline: none; }
                .btn-add-loc { background: white; color: black; border: none; border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; justify-content: center; cursor: pointer; }
                .btn-add-loc:hover { background: hsl(var(--primary)); color: white; }

                .intl-notice { text-align: center; padding: 5rem 2rem; color: hsl(var(--text-muted)); }
                .intl-notice h3 { color: #fff; margin: 1.5rem 0 0.5rem; }

                .pro-tips { display: flex; gap: 1rem; background: hsl(var(--info) / 0.1); border: 1px solid hsl(var(--info) / 0.2); padding: 1.25rem; border-radius: 15px; grid-column: 1 / -1; margin-top: 2rem; font-size: 0.85rem; color: hsl(var(--info)); line-height: 1.5; }
                
                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 1000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: hsl(var(--success)); color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .toast-error { background: hsl(var(--danger)); color: white; }
                
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @media (max-width: 1000px) { .shipping-grid { gridTemplateColumns: 1fr; } .sidebar { display: none; } }
            `}</style>
        </div>
    );
}
