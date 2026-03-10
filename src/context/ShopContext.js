'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ShopContext = createContext();

export function ShopProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [shippingZones, setShippingZones] = useState([]);
    const [zoneMappings, setZoneMappings] = useState([]);
    const [businessState, setBusinessState] = useState('Tamil Nadu');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasMounted, setHasMounted] = useState(false);

    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        country: 'India',
        pincode: '',
        paymentMethod: 'COD'
    });

    // ── EFFECTS ──
    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
        fetchBusinessState();
        fetchShippingRates();
        checkSession();
    }, []);

    // ── CART PERSISTENCE ──
    useEffect(() => {
        if (!hasMounted) return;
        localStorage.setItem('aiswarya_cart', JSON.stringify(cart));

        const syncCart = async () => {
            if (user?.id) {
                try {
                    await supabase
                        .from('customers')
                        .update({ cart_data: cart })
                        .eq('id', user.id);
                } catch (err) {
                    console.error('Cart sync error:', err);
                }
            }
        };

        const timer = setTimeout(syncCart, 1000);
        return () => clearTimeout(timer);
    }, [cart, user?.id, hasMounted]);

    async function checkSession() {
        const storedUser = localStorage.getItem('aiswarya_user');
        if (storedUser) {
            try {
                const localUser = JSON.parse(storedUser);
                const { data: dbUser } = await supabase.from('customers').select('*').eq('id', localUser.id).single();
                const activeUser = dbUser || localUser;
                setUser(activeUser);
                if (activeUser.cart_data && Array.isArray(activeUser.cart_data) && activeUser.cart_data.length > 0) {
                    setCart(activeUser.cart_data);
                }
                setCheckoutForm(prev => ({
                    ...prev,
                    name: activeUser.name || '',
                    phone: activeUser.phone ? activeUser.phone.replace(/^91/, '') : ''
                }));
            } catch (e) {
                console.error('Failed to parse user session');
                localStorage.removeItem('aiswarya_user');
            }
        }
    }

    async function handleLogout() {
        localStorage.clear();
        setUser(null);
        setCheckoutForm({
            name: '', phone: '', address: '', city: '', state: 'Tamil Nadu', country: 'India', pincode: '', paymentMethod: 'COD'
        });
        showToast('Logged out successfully');
    }

    async function fetchProducts() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (data) setProducts(data);
        } catch (err) {
            console.error('Fetch Error:', err);
            showToast('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchShippingRates() {
        try {
            const { data: zones } = await supabase.from('shipping_zones').select('*');
            const { data: mappings } = await supabase.from('shipping_zone_states').select('*');
            if (zones) setShippingZones(zones);
            if (mappings) setZoneMappings(mappings);
        } catch (err) {
            console.error('Shipping Rates Fetch Error:', err);
        }
    }

    async function fetchBusinessState() {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'business_state').single();
        if (data) setBusinessState(data.value);
    }

    function showToast(message, type = 'success') {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }

    function addToCart(product, variant = null) {
        if (!user) {
            showToast('Please login to add items to cart', 'error');
            return;
        }

        const itemStock = variant ? variant.stock : product.stock;
        if (itemStock < 1) {
            showToast('This item is out of stock', 'error');
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => (variant ? i.variantId === variant.id : i.id === product.id));
            if (existing) {
                if (existing.qty >= itemStock) {
                    showToast(`Only ${itemStock} in stock`, 'error');
                    return prev;
                }
                return prev.map(i => (variant ? i.variantId === variant.id : i.id === product.id) ? { ...i, qty: i.qty + 1 } : i);
            }

            const newEntry = {
                ...product,
                price: variant ? variant.price : product.price,
                image_url: (variant && variant.image_url) ? variant.image_url : product.image_url,
                qty: 1,
                variantId: variant?.id,
                variantName: variant?.name
            };
            return [...prev, newEntry];
        });

        showToast(`✨ ${product.name}${variant ? ` (${variant.name})` : ''} added to cart!`);
    }

    function updateQty(index, delta) {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            // Simple stock check helper logic could be added here if needed
            item.qty = Math.max(0, item.qty + delta);
            return item.qty > 0 ? newCart : newCart.filter((_, i) => i !== index);
        });
    }

    function removeFromCart(index) {
        setCart(prev => prev.filter((_, i) => i !== index));
    }

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);

    const taxDetails = useMemo(() => {
        const subtotal = cartTotal;
        let cgst = 0, sgst = 0, igst = 0;
        let isInternational = checkoutForm.country.toLowerCase() !== 'india';

        if (!isInternational) {
            const normalizedFormState = (checkoutForm.state || '').trim().toLowerCase();
            const normalizedBizState = (businessState || 'Tamil Nadu').trim().toLowerCase();
            if (normalizedFormState === normalizedBizState) {
                cgst = Math.round(subtotal * 0.025);
                sgst = Math.round(subtotal * 0.025);
            } else {
                igst = Math.round(subtotal * 0.05);
            }
        }

        let shipping = 0;
        let activeZone = null;
        if (!isInternational) {
            const districtMapping = zoneMappings.find(m => m.state_name === checkoutForm.state && m.district_name?.toLowerCase() === checkoutForm.city.trim().toLowerCase());
            if (districtMapping) activeZone = shippingZones.find(z => z.id === districtMapping.zone_id);
            else {
                const stateMapping = zoneMappings.find(m => m.state_name === checkoutForm.state && !m.district_name);
                if (stateMapping) activeZone = shippingZones.find(z => z.id === stateMapping.zone_id);
                else activeZone = shippingZones.find(z => !z.is_international);
            }
        } else {
            activeZone = shippingZones.find(z => z.is_international);
        }

        if (activeZone) {
            shipping = parseFloat(activeZone.rate || 0);
            const threshold = parseFloat(activeZone.free_threshold || 0);
            if (threshold > 0 && subtotal >= threshold) shipping = 0;
        } else {
            shipping = isInternational ? 2500 : 100;
        }

        const totalOrder = subtotal + cgst + sgst + igst + shipping;
        return { cgst, sgst, igst, shipping, totalOrder, activeZone, isInternational };
    }, [cartTotal, checkoutForm.state, checkoutForm.city, checkoutForm.country, businessState, shippingZones, zoneMappings]);

    async function placeOrder() {
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        try {
            const orderId = `WEB-${Date.now().toString().slice(-6)}`;
            const customerPhone = checkoutForm.phone.replace(/\D/g, '');
            const fullPhone = customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`;
            const fullAddress = `${checkoutForm.address}, ${checkoutForm.city} - ${checkoutForm.pincode} (${checkoutForm.state}, ${checkoutForm.country})`.trim();

            const { error: orderError } = await supabase.from('orders').insert({
                id: orderId,
                customer_id: user?.id,
                customer_phone: fullPhone,
                customer_name: checkoutForm.name,
                delivery_address: fullAddress,
                shipping_state: checkoutForm.state,
                shipping_cost: taxDetails.shipping,
                shipping_zone_id: taxDetails.activeZone?.id,
                status: checkoutForm.paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT',
                total_amount: taxDetails.totalOrder,
                cgst: taxDetails.cgst,
                sgst: taxDetails.sgst,
                igst: taxDetails.igst,
                payment_method: checkoutForm.paymentMethod,
                source: 'WEBSITE',
                created_at: new Date()
            });

            if (orderError) throw orderError;

            const items = cart.map(item => ({
                order_id: orderId,
                product_id: item.id,
                product_name: item.name,
                quantity: item.qty,
                price_at_time: item.price,
                variant_id: item.variantId || null,
                variant_name: item.variantName || null
            }));
            await supabase.from('order_items').insert(items);

            // Deduct stock
            for (const item of cart) {
                if (item.variantId) {
                    const { data: v } = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
                    if (v) {
                        const newStock = Math.max(0, v.stock - item.qty);
                        await supabase.from('product_variants').update({ stock: newStock }).eq('id', item.variantId);
                        await supabase.from('product_history').insert({
                            product_id: item.id, variant_id: item.variantId,
                            change_type: 'SALE', quantity_change: -item.qty, new_stock: newStock,
                            reason: `Website Order #${orderId}`
                        });
                    }
                } else {
                    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
                    if (prod) {
                        const newStock = Math.max(0, prod.stock - item.qty);
                        await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                        await supabase.from('product_history').insert({
                            product_id: item.id,
                            change_type: 'SALE', quantity_change: -item.qty, new_stock: newStock,
                            reason: `Website Order #${orderId}`
                        });
                    }
                }
                await supabase.rpc('increment_total_sold', { prod_id: item.id, qty: item.qty });
            }

            const finalOrderData = {
                orderId,
                customerName: checkoutForm.name,
                total: taxDetails.totalOrder,
                cgst: taxDetails.cgst,
                sgst: taxDetails.sgst,
                igst: taxDetails.igst,
                shipping: taxDetails.shipping
            };

            setCart([]);
            showToast('Order Placed Successfully!', 'success');
            return finalOrderData;

        } catch (err) {
            console.error(err);
            showToast('Order failed. Please try again.', 'error');
            throw err;
        }
    }

    return (
        <ShopContext.Provider value={{
            products, cart, loading, user, setUser, shippingZones, zoneMappings, businessState,
            checkoutForm, setCheckoutForm, addToCart, removeFromCart, updateQty,
            handleLogout, showToast, toast, cartTotal, cartCount, taxDetails, supabase, placeOrder
        }}>
            {children}
        </ShopContext.Provider>
    );
}

export const useShop = () => {
    const context = useContext(ShopContext);
    if (context === undefined) {
        return {
            products: [], cart: [], loading: false, user: null, setUser: () => { },
            shippingZones: [], zoneMappings: [], businessState: 'Tamil Nadu',
            checkoutForm: { name: '', phone: '', address: '', city: '', state: 'Tamil Nadu', country: 'India', pincode: '', paymentMethod: 'COD' },
            setCheckoutForm: () => { }, addToCart: () => { }, removeFromCart: () => { }, updateQty: () => { },
            handleLogout: () => { }, showToast: () => { }, toast: { show: false, message: '', type: 'success' },
            cartTotal: 0, cartCount: 0, taxDetails: { cgst: 0, sgst: 0, igst: 0, shipping: 0, totalOrder: 0 },
            supabase: null, placeOrder: () => { }
        };
    }
    return context;
};
