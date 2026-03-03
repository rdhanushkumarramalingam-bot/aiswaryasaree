'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
    Search, ShoppingCart, User, LogOut, ChevronLeft,
    CheckCircle, MessageCircle, Package, Tag, ArrowRight, X
} from 'lucide-react';
import styles from './shop.module.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function ShopContent() {
    const searchParams = useSearchParams();
    const whatsappPhone = searchParams.get('phone') || '';
    const pidInput = searchParams.get('pid') || '';
    const actionInput = searchParams.get('action') || '';

    // ── STATE ──
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('shop'); // shop | cart | checkout | success
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState(['All']);
    const [orderData, setOrderData] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [toast, setToast] = useState(null);
    const [shippingZones, setShippingZones] = useState([]);
    const [zoneMappings, setZoneMappings] = useState([]);
    const [user, setUser] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [variants, setVariants] = useState([]); // All variants for selected product

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

    const [businessState, setBusinessState] = useState('Tamil Nadu');

    // ── DERIVED STATE ──
    const filteredProducts = useMemo(() => {
        let filtered = products;
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [products, selectedCategory, searchQuery]);

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);

    const taxDetails = useMemo(() => {
        const subtotal = cartTotal;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (checkoutForm.country === 'India') {
            if (checkoutForm.state === businessState) {
                cgst = Math.round(subtotal * 0.09 * 100) / 100;
                sgst = Math.round(subtotal * 0.09 * 100) / 100;
            } else {
                igst = Math.round(subtotal * 0.18 * 100) / 100;
            }
        }

        // Zone-Based Shipping Logic
        let shipping = 0;
        let activeZone = null;

        if (checkoutForm.country === 'India') {
            const mapping = zoneMappings.find(m => m.state_name === checkoutForm.state);
            if (mapping) {
                activeZone = shippingZones.find(z => z.id === mapping.zone_id);
            } else {
                // Fallback to first non-international zone if not specifically mapped
                activeZone = shippingZones.find(z => !z.is_international);
            }
        } else {
            // International
            activeZone = shippingZones.find(z => z.is_international);
        }

        if (activeZone) {
            shipping = parseFloat(activeZone.rate || 0);
            const threshold = parseFloat(activeZone.free_threshold || 0);
            if (threshold > 0 && subtotal >= threshold) {
                shipping = 0;
            }
        } else {
            // Absolute fallback if no zones are loaded yet
            shipping = checkoutForm.country === 'India' ? 99 : 1500;
        }

        const totalOrder = subtotal + cgst + sgst + igst + shipping;

        return { cgst, sgst, igst, shipping, totalOrder, activeZone };
    }, [cartTotal, checkoutForm.state, checkoutForm.country, businessState, shippingZones, zoneMappings]);

    // ── EFFECTS ──
    useEffect(() => {
        fetchProducts();
        fetchBusinessState();
        fetchShippingRates();
        checkSession();
    }, []);

    async function checkSession() {
        const storedUser = localStorage.getItem('aiswarya_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                setCheckoutForm(prev => ({
                    ...prev,
                    name: userData.name || '',
                    phone: userData.phone ? userData.phone.replace(/^91/, '') : ''
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

    useEffect(() => {
        if (whatsappPhone) {
            setCheckoutForm(prev => ({ ...prev, phone: whatsappPhone.replace(/^91/, '') }));
        }

        if (pidInput && products.length > 0) {
            const target = products.find(p => String(p.id) === String(pidInput));
            if (target && target.stock > 0) {
                if (target.type === 'variant') {
                    // Open modal for variant selection
                    setSelectedProduct(target);
                } else {
                    setCart([{ ...target, qty: 1 }]);
                    if (actionInput === 'addtocart') {
                        setView('cart');
                        showToast(`✨ ${target.name} added to cart!`);
                    } else {
                        setView('checkout');
                    }
                }
            }
        }
    }, [whatsappPhone, pidInput, actionInput, products]);

    // ── HELPER FUNCTIONS ──
    async function fetchProducts() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data) {
                setProducts(data);
                const cats = ['All', ...new Set(data.map(p => p.category).filter(Boolean))];
                setCategories(cats);
            }
        } catch (err) {
            console.error('Fetch Error:', err);
            showToast('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function openProductModal(product) {
        setSelectedProduct(product);
        setSelectedVariant(null);
        if (product.type === 'variant') {
            const { data } = await supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at', { ascending: true });
            setVariants(data || []);
            if (data?.length > 0) setSelectedVariant(data[0]);
        }
    }

    function showToast(message, type = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    function addToCart(product, variant = null) {
        if (product.type === 'variant' && !variant) {
            openProductModal(product);
            return;
        }

        const itemStock = variant ? variant.stock : product.stock;
        if (itemStock < 1) {
            showToast('This item is out of stock', 'error');
            return;
        }

        setCart(prev => {
            const itemId = variant ? `${product.id}-${variant.id}` : product.id;
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
        setSelectedProduct(null);
    }

    function updateQty(index, delta) {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            const stockLimit = item.variantId ?
                (variants.find(v => v.id === item.variantId)?.stock || item.qty + 10) :
                (products.find(p => p.id === item.id)?.stock || item.qty + 10);

            if (delta > 0 && item.qty >= stockLimit) {
                showToast(`Max stock reached`, 'error');
                return prev;
            }

            item.qty = Math.max(0, item.qty + delta);
            return item.qty > 0 ? newCart : newCart.filter((_, i) => i !== index);
        });
    }

    function removeFromCart(index) {
        setCart(prev => prev.filter((_, i) => i !== index));
    }

    async function placeOrder() {
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setPlacing(true);

        try {
            const orderId = `WEB-${Date.now().toString().slice(-6)}`;
            const customerPhone = checkoutForm.phone.replace(/\D/g, '');
            const fullPhone = customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`;
            const fullAddress = `${checkoutForm.address}, ${checkoutForm.city} - ${checkoutForm.pincode} (${checkoutForm.state}, ${checkoutForm.country})`.trim();

            const { error: orderError } = await supabase.from('orders').insert({
                id: orderId,
                customer_id: user?.id, // Link to the customer record
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

            for (const item of cart) {
                if (item.variantId) {
                    const { data: v } = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
                    if (v) await supabase.from('product_variants').update({ stock: Math.max(0, v.stock - item.qty) }).eq('id', item.variantId);
                } else {
                    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
                    if (prod) await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', item.id);
                }
            }

            setOrderData({
                orderId,
                customerName: checkoutForm.name,
                total: taxDetails.totalOrder
            });
            setCart([]);
            setView('success');
            showToast('Order Placed Successfully!', 'success');

        } catch (err) {
            console.error(err);
            showToast('Order failed. Please try again.', 'error');
        } finally {
            setPlacing(false);
        }
    }

    function goToWhatsApp(orderId) {
        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);
        const bizPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '917558189732';
        window.open(`https://wa.me/${bizPhone}?text=${message}`, '_self');
    }

    return (
        <div className={styles.shopApp}>
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                    {toast.message}
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>💮</span>
                        <div>
                            <div className={styles.logoName}>Aiswarya Sarees</div>
                            <div className={styles.logoTagline}>Premium Ethnic Collections</div>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        {user ? (
                            <div className={styles.userProfile}>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{user.name || 'User'}</span>
                                    <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
                                </div>
                                <div className={styles.userAvatar}>{(user.name?.[0] || 'U').toUpperCase()}</div>
                            </div>
                        ) : (
                            <button onClick={() => window.location.href = '/login'} className={styles.loginBtn}>
                                Login
                            </button>
                        )}
                        {view !== 'success' && (
                            <>
                                {view !== 'shop' && (
                                    <button onClick={() => setView('shop')} className={styles.backBtn}>
                                        ← back
                                    </button>
                                )}
                                {view === 'shop' && cart.length > 0 && (
                                    <button onClick={() => setView('cart')} className={styles.cartBtn}>
                                        <span className={styles.cartIcon}>🛒</span>
                                        <span className={styles.cartBadge}>{cartCount}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {view === 'shop' && (
                    <>
                        <div className={styles.hero}>
                            <div className={styles.heroContent}>
                                <div className={styles.heroTag}>✨ Collection 2026</div>
                                <h1 className={styles.heroTitle}>Elegance in Every Drape</h1>
                                <p className={styles.heroSubtitle}>Authentic Silk and Cotton sarees for every occasion.</p>
                            </div>
                        </div>

                        <div className={styles.filterBar}>
                            <div className={styles.searchBox}>
                                <span className={styles.searchIcon}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search sarees..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <div className={styles.categoryScroll}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`${styles.catChip} ${selectedCategory === cat ? styles.catChipActive : ''}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.loadingGrid}>
                                {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
                            </div>
                        ) : (
                            <div className={styles.productsGrid}>
                                {filteredProducts.map(product => (
                                    <div key={product.id} className={styles.productCard}>
                                        <div className={styles.productImageWrap} onClick={() => openProductModal(product)}>
                                            <img
                                                src={product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'}
                                                alt={product.name}
                                                className={styles.productImage}
                                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                                            />
                                            {product.stock === 0 && <div className={styles.outOfStockOverlay}>Sold Out</div>}
                                            {product.type === 'variant' && <div className={styles.variantBadge}>✨ Variants Available</div>}
                                        </div>
                                        <div className={styles.productInfo}>
                                            <div className={styles.productCategory}>{product.category}</div>
                                            <h3 className={styles.productName} onClick={() => openProductModal(product)}>{product.name}</h3>
                                            <div className={styles.productPrice}>₹{product.price.toLocaleString()}</div>
                                            <button
                                                onClick={() => (product.type === 'variant' ? openProductModal(product) : addToCart(product))}
                                                disabled={product.stock === 0}
                                                className={`${styles.addToCartBtn} ${product.stock === 0 ? styles.addToCartDisabled : ''}`}
                                            >
                                                {product.stock === 0 ? 'Out of Stock' : (product.type === 'variant' ? 'Select Option' : 'Add to Cart')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {view === 'cart' && (
                    <div className={styles.cartView}>
                        <div className={styles.sectionTitle}><h2>Your Shopping Cart</h2></div>
                        {cart.length === 0 ? (
                            <div className={styles.emptyState}><h3>Your cart is empty</h3></div>
                        ) : (
                            <div className={styles.cartLayout}>
                                <div className={styles.cartItems}>
                                    {cart.map((item, idx) => (
                                        <div key={idx} className={styles.cartItem}>
                                            <img src={item.image_url} className={styles.cartItemImage} />
                                            <div className={styles.cartItemDetails}>
                                                <div className={styles.cartItemName}>{item.name} {item.variantName && <small>({item.variantName})</small>}</div>
                                                <div className={styles.qtyControl}>
                                                    <button onClick={() => updateQty(idx, -1)} className={styles.qtyBtn}>−</button>
                                                    <span>{item.qty}</span>
                                                    <button onClick={() => updateQty(idx, 1)} className={styles.qtyBtn}>+</button>
                                                </div>
                                            </div>
                                            <div className={styles.cartItemTotal}>₹{(item.price * item.qty).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.cartSummary}>
                                    <div className={styles.summaryCard}>
                                        <h3>Summary</h3>
                                        <div className={styles.summaryLine}><span>Subtotal</span><span>₹{cartTotal.toLocaleString()}</span></div>
                                        <button onClick={() => setView('checkout')} className={styles.checkoutBtn}>Proceed to Checkout</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'checkout' && (
                    <div className={styles.checkoutView}>
                        <div className={styles.sectionTitle}><h2>Checkout</h2></div>
                        <div className={styles.checkoutLayout}>
                            <div className={styles.checkoutForm}>
                                <div className={styles.formSection}>
                                    <h3>Shipping Details</h3>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label>Name</label>
                                            <input type="text" value={checkoutForm.name} onChange={e => setCheckoutForm(p => ({ ...p, name: e.target.value }))} className={styles.formInput} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>WhatsApp</label>
                                            <input type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm(p => ({ ...p, phone: e.target.value }))} className={styles.formInput} />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Address</label>
                                        <textarea value={checkoutForm.address} onChange={e => setCheckoutForm(p => ({ ...p, address: e.target.value }))} className={styles.formInput} />
                                    </div>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label>Country</label>
                                            <select value={checkoutForm.country} onChange={e => setCheckoutForm(p => ({ ...p, country: e.target.value, state: e.target.value === 'India' ? 'Tamil Nadu' : '' }))} className={styles.formSelect}>
                                                <option value="India">India</option>
                                                <option value="International">International</option>
                                            </select>
                                        </div>
                                        {checkoutForm.country === 'India' ? (
                                            <div className={styles.formGroup}>
                                                <label>State</label>
                                                <select value={checkoutForm.state} onChange={e => setCheckoutForm(p => ({ ...p, state: e.target.value }))} className={styles.formSelect}>
                                                    {["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className={styles.formGroup}>
                                                <label>Region/State</label>
                                                <input type="text" value={checkoutForm.state} onChange={e => setCheckoutForm(p => ({ ...p, state: e.target.value }))} className={styles.formInput} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.formSection}>
                                    <h3>Payment</h3>
                                    <div className={styles.paymentOptions}>
                                        <label><input type="radio" value="COD" checked={checkoutForm.paymentMethod === 'COD'} onChange={e => setCheckoutForm(p => ({ ...p, paymentMethod: 'COD' }))} /> Cash on Delivery</label>
                                        <label><input type="radio" value="UPI" checked={checkoutForm.paymentMethod === 'UPI'} onChange={e => setCheckoutForm(p => ({ ...p, paymentMethod: 'UPI' }))} /> UPI / Online</label>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.checkoutSummary}>
                                <div className={styles.summaryCard}>
                                    <h3>Order Total</h3>
                                    <div className={styles.summaryLine}><span>Subtotal</span><span>₹{cartTotal.toLocaleString()}</span></div>
                                    {taxDetails.cgst > 0 && (
                                        <>
                                            <div className={styles.summaryLine}><span>CGST (9%)</span><span>₹{taxDetails.cgst.toLocaleString()}</span></div>
                                            <div className={styles.summaryLine}><span>SGST (9%)</span><span>₹{taxDetails.sgst.toLocaleString()}</span></div>
                                        </>
                                    )}
                                    {taxDetails.igst > 0 && <div className={styles.summaryLine}><span>IGST (18%)</span><span>₹{taxDetails.igst.toLocaleString()}</span></div>}
                                    <div className={styles.summaryLine}>
                                        <span>Shipping {taxDetails.activeZone && <small style={{ opacity: 0.6, fontSize: '0.7em', display: 'block' }}>({taxDetails.activeZone.name})</small>}</span>
                                        <span>{taxDetails.shipping === 0 ? 'FREE' : `₹${taxDetails.shipping.toLocaleString()}`}</span>
                                    </div>
                                    <div className={styles.summaryDivider} />
                                    <div className={styles.summaryTotalLine}><span>Grand Total</span><span>₹{taxDetails.totalOrder.toLocaleString()}</span></div>
                                    <button onClick={placeOrder} disabled={placing} className={styles.placeOrderBtn}>{placing ? 'Processing...' : 'Place Order'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'success' && orderData && (
                    <div className={styles.successView}>
                        <div className={styles.successCard}>
                            <h2>Order Confirmed!</h2>
                            <p>Thank you, {orderData.customerName}!</p>
                            <p>Order ID: <strong>#{orderData.orderId}</strong></p>
                            <p>Total: <strong>₹{orderData.total.toLocaleString()}</strong></p>
                            <button onClick={() => goToWhatsApp(orderData.orderId)} className={styles.waBtn}>Confirm on WhatsApp</button>
                        </div>
                    </div>
                )}
            </main>

            {selectedProduct && (
                <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}><X size={20} /></button>

                        <div className={styles.modalContent}>
                            <div className={styles.modalImageWrap}>
                                <img
                                    key={selectedVariant?.id || 'base'}
                                    src={(selectedVariant?.image_url && selectedVariant.image_url.trim() !== '') ? selectedVariant.image_url : (selectedProduct.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80')}
                                    alt={selectedProduct.name}
                                    className={styles.modalImage}
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80'; }}
                                />
                            </div>

                            <div className={styles.modalDetails}>
                                <div className={styles.modalCategory}>{selectedProduct.category}</div>
                                <h2 className={styles.modalTitle}>{selectedProduct.name}</h2>

                                <div className={styles.modalPricing}>
                                    <span className={styles.modalPrice}>₹{(selectedVariant?.price || selectedProduct.price).toLocaleString()}</span>
                                    {(selectedVariant?.stock <= 5 || selectedProduct.stock <= 5) && (
                                        <span className={styles.stockLow}>Low Stock!</span>
                                    )}
                                </div>

                                <div className={styles.modalDivider} />

                                <div className={styles.descSection}>
                                    <h4 className={styles.sectionHeader}>Product Description</h4>
                                    <p className={styles.modalDesc}>{selectedProduct.description || 'No description available for this premium saree.'}</p>
                                </div>

                                {selectedProduct.type === 'variant' && (
                                    <div className={styles.variantSection}>
                                        <h4 className={styles.sectionHeader}>Select Color / Option</h4>
                                        <div className={styles.variantChoices}>
                                            {variants.map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariant(v)}
                                                    className={`${styles.variantBtn} ${selectedVariant?.id === v.id ? styles.variantBtnActive : ''}`}
                                                >
                                                    {v.image_url && (
                                                        <img src={v.image_url} className={styles.variantIcon} onError={(e) => e.target.style.display = 'none'} />
                                                    )}
                                                    <span>{v.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.modalActions}>
                                    <button
                                        onClick={() => addToCart(selectedProduct, selectedVariant)}
                                        disabled={(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0}
                                        className={styles.modalAddBtn}
                                    >
                                        <ShoppingCart size={18} />
                                        {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) === 0 ? 'Out of Stock' : 'Add to Cart'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={<div>Loading Shop...</div>}>
            <ShopContent />
        </Suspense>
    );
}
