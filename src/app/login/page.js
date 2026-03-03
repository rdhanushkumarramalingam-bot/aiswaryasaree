'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock, User, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function UnifiedLoginPage() {
    const router = useRouter();
    const [role, setRole] = useState('admin'); // 'user' or 'admin'

    // Admin Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // User Login State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: phone, 2: otp

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                // Save to LocalStorage (No Cookies)
                localStorage.setItem('aiswarya_admin', 'true');
                localStorage.setItem('aiswarya_user', JSON.stringify(data));
                router.push('/admin');
            } else {
                setError(data.error || 'Invalid username or password');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, role: 'user' })
            });
            const data = await res.json();
            if (res.ok) setStep(2);
            else setError(data.error || 'Failed to send OTP');
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, role: 'user' })
            });
            const data = await res.json();
            if (res.ok) {
                // Save to LocalStorage (No Cookies)
                localStorage.setItem('aiswarya_user', JSON.stringify(data.customer));
                router.push('/shop');
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Verification failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0a0a0a', padding: '1.5rem', fontFamily: 'sans-serif', color: '#fff'
        }}>
            <div style={{
                maxWidth: '440px', width: '100%', background: '#141414', padding: '2.5rem',
                borderRadius: '1.5rem', border: '1px solid #222', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '64px', height: '64px', background: 'white', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
                        }}>
                            <span style={{ fontSize: '2rem' }}>💮</span>
                        </div>
                    </div>
                    <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>Cast Prince</h1>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        {role === 'admin' ? 'Business Admin Portal' : 'Customer Shop Portal'}
                    </p>
                </div>

                {/* Role Switcher */}
                <div style={{ display: 'flex', background: '#1a1a1a', padding: '5px', borderRadius: '14px', marginBottom: '2.5rem' }}>
                    <button
                        onClick={() => { setRole('admin'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: role === 'admin' ? '#333' : 'transparent',
                            color: role === 'admin' ? '#fff' : '#666',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <ShieldCheck size={18} /> Admin
                    </button>
                    <button
                        onClick={() => { setRole('user'); setError(''); setStep(1); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: role === 'user' ? '#333' : 'transparent',
                            color: role === 'user' ? '#fff' : '#666',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <User size={18} /> Customer
                    </button>
                </div>

                {/* ADMIN LOGIN FORM */}
                {role === 'admin' && (
                    <form onSubmit={handleAdminLogin}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: '#888' }}>
                                Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={20} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '1rem 1rem 1rem 3.25rem',
                                        borderRadius: '0.9rem', border: '1px solid #222',
                                        background: '#0a0a0a', color: '#fff', boxSizing: 'border-box',
                                        fontSize: '0.95rem', outline: 'none', transition: '0.2s'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: '#888' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={20} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '1rem 3.25rem 1rem 3.25rem',
                                        borderRadius: '0.9rem', border: '1px solid #222',
                                        background: '#0a0a0a', color: '#fff', boxSizing: 'border-box',
                                        fontSize: '0.95rem', outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1.1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff',
                            border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', transition: 'transform 0.1s active:scale-95', marginBottom: '1.5rem'
                        }}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <>🚀 Login to Dashboard</>}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <a href="#" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'underline' }}>Forgot Password?</a>
                        </div>
                    </form>
                )}

                {/* USER LOGIN FORM (Phone + OTP) */}
                {role === 'user' && (
                    <>
                        {step === 1 ? (
                            <form onSubmit={handleSendOTP}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: '#888' }}>
                                        WhatsApp Number
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                        <input
                                            type="tel"
                                            placeholder="Enter mobile number"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            required
                                            style={{
                                                width: '100%', padding: '1rem 1rem 1rem 3.5rem',
                                                borderRadius: '0.9rem', border: '1px solid #222',
                                                background: '#0a0a0a', color: '#fff', boxSizing: 'border-box',
                                                fontSize: '1rem', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}

                                <button type="submit" disabled={loading} style={{
                                    width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: '#fff',
                                    border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    cursor: 'pointer'
                                }}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Send OTP via WhatsApp <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP}>
                                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: 'rgba(37, 211, 102, 0.1)', borderRadius: '50px', color: '#25D366', fontSize: '0.85rem', fontWeight: 700 }}>
                                        <CheckCircle2 size={18} /> Verifying {phone}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: '#888', textAlign: 'center' }}>
                                        Enter 6-Digit Code
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        required
                                        style={{
                                            width: '100%', padding: '1.1rem',
                                            borderRadius: '0.9rem', border: '1px solid #222',
                                            background: '#0a0a0a', color: '#fff', boxSizing: 'border-box',
                                            fontSize: '1.5rem', outline: 'none', letterSpacing: '8px', textAlign: 'center'
                                        }}
                                    />
                                </div>

                                {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}

                                <button type="submit" disabled={loading} style={{
                                    width: '100%', padding: '1.1rem', background: '#fff', color: '#000',
                                    border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1.1rem',
                                    cursor: 'pointer'
                                }}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Continue'}
                                </button>

                                <button type="button" onClick={() => setStep(1)} style={{
                                    width: '100%', marginTop: '1.5rem', background: 'none', border: 'none',
                                    color: '#555', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
                                }}>
                                    Try a different number
                                </button>
                            </form>
                        )}
                    </>
                )}

                <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ShieldCheck size={14} /> Secure Admin Access Only
                    </p>
                </div>
            </div>
        </div>
    );
}
