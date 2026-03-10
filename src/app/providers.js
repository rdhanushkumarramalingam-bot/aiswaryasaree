'use client';

import { ShopProvider } from '@/context/ShopContext';

export function Providers({ children }) {
    return (
        <ShopProvider>
            {children}
        </ShopProvider>
    );
}
