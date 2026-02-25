'use client';

import { CartProvider } from '@/lib/cartContext';

export function Providers({ children }) {
    return (
        <CartProvider>
            {children}
        </CartProvider>
    );
}
