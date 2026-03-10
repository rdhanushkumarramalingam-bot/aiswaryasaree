'use client';

import { useShop } from '@/context/ShopContext';
import styles from '@/app/(shop-portal)/portal.module.css';

export default function PortalWrapper({ children }) {
    const { toast } = useShop();

    return (
        <>
            {children}
            {toast?.show && (
                <div className={`${styles.toast} ${styles[`toast${toast.type}`]}`}>
                    {toast.message}
                </div>
            )}
        </>
    );
}
