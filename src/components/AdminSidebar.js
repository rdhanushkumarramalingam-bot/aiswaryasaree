'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Users, FileText, Settings, MessageSquare, LogOut, Megaphone } from 'lucide-react';

const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: ShoppingBag },
    { name: 'Orders', href: '/admin/orders', icon: Package },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
    { name: 'WhatsApp Funnel', href: '/admin/whatsapp', icon: MessageSquare },
    { name: 'Invoices', href: '/admin/invoices', icon: FileText },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ isOpen }) {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Brand */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0 0.5rem 2rem', marginBottom: '1.5rem',
                borderBottom: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', color: 'hsl(var(--bg-app))',
                    boxShadow: '0 0 15px hsl(var(--primary) / 0.4)'
                }}>
                    🌸
                </div>
                <div>
                    <h1 style={{
                        fontSize: '1.25rem', fontWeight: 700, margin: 0,
                        fontFamily: 'var(--font-heading)', letterSpacing: '0'
                    }}>Aiswarya</h1>
                    <p style={{
                        fontSize: '0.65rem', color: 'hsl(var(--primary))', margin: 0,
                        textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600
                    }}>Premium Portal</p>
                </div>
            </div>

            {/* WhatsApp Status */}
            <div style={{
                margin: '0 0 1.5rem', padding: '0.75rem 1rem',
                background: 'hsl(var(--success) / 0.1)',
                borderRadius: 'var(--radius)',
                border: '1px solid hsl(var(--success) / 0.2)',
                display: 'flex', alignItems: 'center', gap: '0.85rem'
            }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--success))' }} />
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: 'hsl(var(--success))', opacity: 0.3, animation: 'pulse 2s infinite' }} />
                </div>
                <div>
                    <span style={{ color: 'hsl(var(--success))', fontWeight: 700, fontSize: '0.75rem', display: 'block' }}>WhatsApp Active</span>
                    <span style={{ color: 'hsl(var(--success) / 0.8)', fontSize: '0.65rem', display: 'block' }}>Bot is online</span>
                </div>
            </div>

            {/* Navigation — takes up available space */}
            <nav style={{ flex: 1 }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive ? 'active' : ''}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ─── LOGOUT BUTTON — always visible at bottom ─── */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1rem' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.8rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '10px',
                        color: '#f87171',
                        fontSize: '0.9rem', fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        letterSpacing: '0.01em',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                    }}
                >
                    <LogOut size={16} />
                    Logout
                </button>

                {/* Admin label */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                    Logged in as <strong style={{ color: 'hsl(var(--primary))' }}>Admin</strong>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
            `}</style>
        </aside>
    );
}
