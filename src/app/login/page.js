'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';
import { ShieldCheck, MessageCircle, ArrowRight, Loader2, Smartphone, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    // Auth Modes
    const [mode, setMode] = useState('otp'); // 'otp' | 'pass'

    // Form Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    // UI State
    const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // ─── ADMIN PASSWORD LOGIN ───
    async function handlePassLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password })
            });

            if (res.ok) {
                router.push(redirectPath || '/admin');
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid credentials.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // ─── WHATSAPP OTP LOGIN ───
    async function handleSendOtp(e) {
        e.preventDefault();
        if (!phone || phone.length < 10) return setError('Enter a valid phone number');

        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();

            if (res.ok) {
                setStep(2);
            } else {
                setError(data.error || 'Failed to send OTP.');
            }
        } catch (err) {
            setError('Something went wrong. Check your connection.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e) {
        e.preventDefault();
        if (!otp || otp.length < 6) return setError('Enter 6-digit code');

        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code: otp })
            });
            const data = await res.json();

            if (res.ok) {
                if (redirectPath) {
                    router.push(redirectPath);
                    return;
                }
                // If it's an admin, go to /admin, else /shop
                if (data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/shop');
                }
            } else {
                setError(data.error || 'Invalid OTP code.');
            }
        } catch (err) {
            setError('Verification failed. Try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.bg}>
                <div className={styles.circle1} />
                <div className={styles.circle2} />
                <div className={styles.circle3} />
            </div>

            <div className={styles.card}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>💮</div>
                    <h1 className={styles.brand}>Cast Prince</h1>
                    <p className={styles.subtitle}>Premium Secure Login</p>
                </div>

                <div className={styles.modeTabs}>
                    <button
                        className={`${styles.tab} ${mode === 'otp' ? styles.activeTab : ''}`}
                        onClick={() => { setMode('otp'); setStep(1); setError(''); }}
                    >
                        <MessageCircle size={16} /> WhatsApp Login
                    </button>
                    <button
                        className={`${styles.tab} ${mode === 'pass' ? styles.activeTab : ''}`}
                        onClick={() => { setMode('pass'); setError(''); }}
                    >
                        <Lock size={16} /> Admin Code
                    </button>
                </div>

                {/* --- WHATSAPP OTP MODE --- */}
                {mode === 'otp' && (
                    <div className="animate-enter">
                        {step === 1 ? (
                            <form onSubmit={handleSendOtp} className={styles.form}>
                                <div className={styles.field}>
                                    <label className={styles.label}>WhatsApp Number</label>
                                    <div className={styles.inputWrap}>
                                        <span className={styles.inputIcon}>📱</span>
                                        <input
                                            className={styles.input}
                                            type="tel"
                                            placeholder="e.g. 917558189732"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className={styles.hint}>We will send a 6-digit security code to your WhatsApp.</p>
                                </div>

                                {error && <div className={styles.error}><AlertCircle size={14} /> {error}</div>}

                                <button className={styles.btn} type="submit" disabled={loading}>
                                    {loading ? <Loader2 className={styles.spinner} /> : <>Generate OTP <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className={styles.form}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Enter Verification Code</label>
                                    <div className={styles.inputWrap}>
                                        <span className={styles.inputIcon}>✉️</span>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="6-digit OTP"
                                            value={otp}
                                            maxLength={6}
                                            onChange={e => setOtp(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                        <p className={styles.hint}>Sent to {phone}</p>
                                        <button type="button" onClick={() => setStep(1)} className={styles.linkBtn}>Change Number</button>
                                    </div>
                                </div>

                                {error && <div className={styles.error}><AlertCircle size={14} /> {error}</div>}

                                <button className={styles.btn} type="submit" disabled={loading}>
                                    {loading ? <Loader2 className={styles.spinner} /> : 'Verify & Login'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* --- ADMIN PASSWORD MODE --- */}
                {mode === 'pass' && (
                    <form onSubmit={handlePassLogin} className={`${styles.form} animate-enter`}>
                        <div className={styles.field}>
                            <label className={styles.label}>Admin Username</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>👤</span>
                                <input
                                    className={styles.input}
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Access Key</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>🔒</span>
                                <input
                                    className={styles.input}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className={styles.eyeBtn}
                                    onClick={() => setShowPass(v => !v)}
                                    tabIndex={-1}
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {error && <div className={styles.error}><AlertCircle size={14} /> {error}</div>}

                        <button className={styles.btn} type="submit" disabled={loading}>
                            {loading ? <Loader2 className={styles.spinner} /> : 'Access Dashboard'}
                        </button>
                    </form>
                )}

                <p className={styles.footer}>
                    <ShieldCheck size={14} /> Your connection is encrypted and secure.
                </p>
            </div>

            <style jsx>{`
                .animate-enter { animation: enter 0.4s ease-out; }
                @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
