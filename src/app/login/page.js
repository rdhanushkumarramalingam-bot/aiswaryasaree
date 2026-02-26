'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim(), password })
        });

        if (res.ok) {
            router.push('/admin');
        } else {
            const data = await res.json();
            setError(data.error || 'Invalid username or password.');
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
                    <p className={styles.subtitle}>Business Admin Portal</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label}>Username</label>
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
                        <label className={styles.label}>Password</label>
                        <div className={styles.inputWrap}>
                            <span className={styles.inputIcon}>🔒</span>
                            <input
                                className={styles.input}
                                type={showPass ? 'text' : 'password'}
                                placeholder="Enter password"
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

                    {error && (
                        <div className={styles.error}>⚠️ {error}</div>
                    )}

                    <button className={styles.btn} type="submit" disabled={loading}>
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : (
                            '🚀 Login to Dashboard'
                        )}
                    </button>

                    {/* Forgot Password link */}
                    <div style={{ textAlign: 'center', marginTop: '-4px' }}>
                        <button
                            type="button"
                            onClick={() => router.push('/forgot-password')}
                            style={{
                                background: 'none', border: 'none',
                                color: '#a78bfa', cursor: 'pointer',
                                fontSize: '13px', textDecoration: 'underline',
                                opacity: 0.8
                            }}
                        >
                            🔑 Forgot Password?
                        </button>
                    </div>
                </form>

                <p className={styles.footer}>🔐 Secure Admin Access Only</p>
            </div>
        </div>
    );
}
