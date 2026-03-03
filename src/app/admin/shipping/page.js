'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Truck, Save, Plus, Trash2, Globe, MapPin, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

export default function ShippingAdminPage() {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form states for new zone
    const [newZone, setNewZone] = useState({
        name: '',
        rate: 100,
        free_threshold: 5000,
        is_international: false
    });

    const [allStates] = useState([
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry",
        "Jammu and Kashmir", "Ladakh"
    ].sort());

    const [selectedStatesByZone, setSelectedStatesByZone] = useState({}); // { zoneId: [stateNames] }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Zones
            const { data: zonesData, error: zonesError } = await supabase
                .from('shipping_zones')
                .select('*')
                .order('is_international', { ascending: true })
                .order('rate', { ascending: true });

            if (zonesError) throw zonesError;

            // 2. Fetch State Mappings
            const { data: mappingData, error: mappingError } = await supabase
                .from('shipping_zone_states')
                .select('*');

            if (mappingError) throw mappingError;

            setZones(zonesData);

            // Group states by zoneId
            const grouping = {};
            mappingData.forEach(row => {
                if (!grouping[row.zone_id]) grouping[row.zone_id] = [];
                grouping[row.zone_id].push(row.state_name);
            });
            setSelectedStatesByZone(grouping);

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load shipping data. Make sure the tables exist in Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateZone = async (id, field, value) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
    };

    const saveChanges = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            // Update zones
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

            // Sync state mappings
            // 1. Clear current mappings for existing zones
            const zoneIds = zones.map(z => z.id);
            if (zoneIds.length > 0) {
                await supabase.from('shipping_zone_states').delete().in('zone_id', zoneIds);

                // 2. Insert new mappings
                const inserts = [];
                Object.entries(selectedStatesByZone).forEach(([zoneId, states]) => {
                    states.forEach(state => {
                        inserts.push({ zone_id: zoneId, state_name: state });
                    });
                });

                if (inserts.length > 0) {
                    const { error: insError } = await supabase.from('shipping_zone_states').insert(inserts);
                    if (insError) throw insError;
                }
            }

            setSuccess('Shipping configurations saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const addZone = async () => {
        if (!newZone.name) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('shipping_zones')
                .insert([newZone])
                .select()
                .single();

            if (error) throw error;

            setZones([...zones, data]);
            setNewZone({ name: '', rate: 100, free_threshold: 5000, is_international: false });
            setSuccess('New zone added!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteZone = async (id) => {
        if (!confirm('Are you sure you want to delete this zone?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
            if (error) throw error;
            setZones(zones.filter(z => z.id !== id));
            setSuccess('Zone deleted.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleState = (zoneId, state) => {
        setSelectedStatesByZone(prev => {
            const current = prev[zoneId] || [];
            // Remove state from ANY other zone first to ensure unique mapping
            const newStateGroup = { ...prev };
            Object.keys(newStateGroup).forEach(id => {
                newStateGroup[id] = (newStateGroup[id] || []).filter(s => s !== state);
            });

            if (current.includes(state)) {
                // If it was already in this zone, removing it remains removed
                newStateGroup[zoneId] = (current.filter(s => s !== state));
            } else {
                // Add to this zone
                newStateGroup[zoneId] = [...(newStateGroup[zoneId] || []), state].sort();
            }
            return newStateGroup;
        });
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" color="hsl(var(--primary))" />
            <p style={{ color: 'hsl(var(--text-muted))' }}>Loading shipping rates...</p>
        </div>
    );

    return (
        <div className="animate-enter" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <Truck size={32} color="hsl(var(--primary))" /> Shipping Zones
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))' }}>Define zone-based shipping charges and map states.</p>
                </div>
                <button onClick={saveChanges} disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save All Changes
                </button>
            </div>

            {error && (
                <div style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.2)', color: 'hsl(var(--danger))', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {success && (
                <div style={{ background: 'hsl(var(--success) / 0.1)', border: '1px solid hsl(var(--success) / 0.2)', color: 'hsl(var(--success))', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={20} /> {success}
                </div>
            )}

            <div style={{ display: 'grid', gap: '2rem' }}>
                {zones.map((zone) => (
                    <div key={zone.id} className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1rem' }}>
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Zone Name</label>
                                    <input
                                        className="input-field"
                                        value={zone.name}
                                        onChange={(e) => handleUpdateZone(zone.id, 'name', e.target.value)}
                                        style={{ marginTop: '0.25rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Rate (₹)</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        value={zone.rate}
                                        onChange={(e) => handleUpdateZone(zone.id, 'rate', e.target.value)}
                                        style={{ marginTop: '0.25rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Free Above (₹)</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        value={zone.free_threshold}
                                        onChange={(e) => handleUpdateZone(zone.id, 'free_threshold', e.target.value)}
                                        style={{ marginTop: '0.25rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={zone.is_international}
                                            onChange={(e) => handleUpdateZone(zone.id, 'is_international', e.target.checked)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>International</span>
                                </div>
                            </div>
                            <button onClick={() => deleteZone(zone.id)} style={{ color: 'hsl(var(--danger))', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {!zone.is_international ? (
                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MapPin size={16} /> Covered States ({(selectedStatesByZone[zone.id] || []).length})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                                    {allStates.map(state => {
                                        const isChecked = (selectedStatesByZone[zone.id] || []).includes(state);
                                        // Check if state is in OTHER zone
                                        const otherZoneId = Object.keys(selectedStatesByZone).find(zid => zid !== zone.id && selectedStatesByZone[zid]?.includes(state));

                                        return (
                                            <div
                                                key={state}
                                                onClick={() => !otherZoneId && toggleState(zone.id, state)}
                                                style={{
                                                    padding: '0.6rem 0.85rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid',
                                                    borderColor: isChecked ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))',
                                                    background: isChecked ? 'hsl(var(--primary) / 0.05)' : 'white',
                                                    fontSize: '0.8rem',
                                                    cursor: otherZoneId ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    opacity: otherZoneId ? 0.4 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    readOnly
                                                    disabled={!!otherZoneId}
                                                />
                                                <span style={{ color: isChecked ? 'hsl(var(--primary))' : 'inherit', fontWeight: isChecked ? 700 : 400 }}>{state}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))' }}>
                                <Globe size={20} color="hsl(var(--primary))" />
                                <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>This zone applies to all <strong>International</strong> orders (non-India countries).</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add New Zone */}
                <div className="card" style={{ padding: '2rem', border: '2px dashed hsl(var(--border-subtle))', background: 'hsl(var(--bg-panel) / 0.5)' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Plus size={24} /> Add New Shipping Zone
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 150px 150px 150px 150px', gap: '1.5rem', alignItems: 'flex-end' }}>
                        <div>
                            <label className="label">Zone Name</label>
                            <input
                                className="input-field"
                                placeholder="e.g. North India"
                                value={newZone.name}
                                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Rate (₹)</label>
                            <input
                                className="input-field"
                                type="number"
                                value={newZone.rate}
                                onChange={(e) => setNewZone({ ...newZone, rate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Free Above (₹)</label>
                            <input
                                className="input-field"
                                type="number"
                                value={newZone.free_threshold}
                                onChange={(e) => setNewZone({ ...newZone, free_threshold: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={newZone.is_international}
                                    onChange={(e) => setNewZone({ ...newZone, is_international: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span style={{ fontSize: '0.85rem' }}>International</span>
                        </div>
                        <button
                            onClick={addZone}
                            disabled={!newZone.name || saving}
                            className="btn btn-secondary"
                            style={{ height: '42px', width: '100%', fontWeight: 700 }}
                        >
                            Add Zone
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border-subtle))', display: 'flex', gap: '1rem' }}>
                <Info size={24} color="hsl(var(--primary))" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>
                    <p style={{ fontWeight: 700, color: 'hsl(var(--text-main))', marginBottom: '0.5rem' }}>How Zone-Based Shipping Works:</p>
                    <ul style={{ paddingLeft: '1.25rem' }}>
                        <li>The system matches the customer's <strong>State</strong> (for India) or <strong>Country</strong> (for International) to a zone.</li>
                        <li>If a state is mapped to a zone, that zone's rate is applied.</li>
                        <li>If "Free Above" is set (non-zero), shipping becomes ₹0 if the subtotal exceeds that amount.</li>
                        <li>Each state can only belong to <strong>one</strong> zone.</li>
                        <li>International orders always trigger the international zone rate.</li>
                    </ul>
                </div>
            </div>

            <style jsx>{`
                .label { display: block; font-size: 0.75rem; font-weight: 700; color: hsl(var(--text-muted)); margin-bottom: 0.5rem; text-transform: uppercase; }
                .input-field {
                    width: 100%; padding: 0.75rem; border-radius: var(--radius-sm);
                    background: hsl(var(--bg-card)); border: 1px solid hsl(var(--border-subtle));
                    color: hsl(var(--text-main)); outline: none; transition: border 0.2s;
                    font-family: inherit; font-size: 0.95rem;
                }
                .input-field:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1); }
                
                .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
                .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: hsl(var(--primary)); }
                input:checked + .slider:before { transform: translateX(20px); }
            `}</style>
        </div>
    );
}
