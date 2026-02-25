'use client';
import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopBar from '@/components/AdminTopBar';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Auto-close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="admin-layout">
            <AdminSidebar isOpen={isSidebarOpen} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        zIndex: 999, backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
                <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="main-content" style={{ overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
