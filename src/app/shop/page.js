'use client';



import { useState, useEffect, Suspense, useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { createClient } from '@supabase/supabase-js';

import styles from './shop.module.css';



const supabase = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL,

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

);



function ShopContent() {

    const searchParams = useSearchParams();

    const whatsappPhone = searchParams.get('phone') || '';

    const pidInput = searchParams.get('pid') || '';



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



    const [checkoutForm, setCheckoutForm] = useState({

        name: '',

        phone: '',

        address: '',

        city: '',

        pincode: '',

        paymentMethod: 'COD'

    });



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



    // ── EFFECTS ──



    // 1. Initial Hydration & Load

    useEffect(() => {

        fetchProducts();

    }, []);



    // 2. Process URL Parameters (Only after products load)

    useEffect(() => {



        // Auto-fill phone

        if (whatsappPhone) {

            setCheckoutForm(prev => ({

                ...prev,

                phone: whatsappPhone.replace(/^91/, '')

            }));

        }



        // Direct Order Logic (PID)

        if (pidInput && products.length > 0) {

            const target = products.find(p => String(p.id) === String(pidInput));

            if (target && target.stock > 0) {

                setCart([{ ...target, qty: 1 }]);

                setView('checkout');

                setSelectedProduct(null);

            }

        }

    }, [whatsappPhone, pidInput, products]);



    // ── HELPER FUNCTIONS ──



    async function fetchProducts() {

        setLoading(true);

        try {

            const { data, error } = await supabase

                .from('products')

                .select('*')

                .eq('is_active', true)

                .order('created_at', { ascending: false });



            if (error) throw error;

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



    function showToast(message, type = 'success') {

        setToast({ message, type });

        setTimeout(() => setToast(null), 3000);

    }



    function addToCart(product) {

        if (product.stock < 1) {

            showToast('This item is out of stock', 'error');

            return;

        }

        setCart(prev => {

            const existing = prev.find(i => i.id === product.id);

            if (existing) {

                if (existing.qty >= product.stock) {

                    showToast(`Only ${product.stock} in stock`, 'error');

                    return prev;

                }

                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);

            }

            return [...prev, { ...product, qty: 1 }];

        });

        showToast(`✨ ${product.name} added to cart!`);

        setSelectedProduct(null);

    }



    function updateQty(productId, delta) {

        setCart(prev => {

            const updated = prev.map(i => i.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i);

            return updated.filter(i => i.qty > 0);

        });

    }



    function removeFromCart(productId) {

        setCart(prev => prev.filter(i => i.id !== productId));

    }



    async function whatsappCheckout() {

        if (cart.length === 0) return;

        setPlacing(true);

        try {

            const orderId = `WEB-${Date.now().toString().slice(-6)}`;

            const finalTotal = cartTotal + (cartTotal >= 2000 ? 0 : 99);



            const { error: orderError } = await supabase.from('orders').insert({

                id: orderId,

                customer_phone: 'PENDING_WA',

                status: 'DRAFT',

                total_amount: finalTotal,

                source: 'WEBSITE',

                created_at: new Date()

            });



            if (orderError) throw orderError;



            const items = cart.map(item => ({

                order_id: orderId,

                product_id: item.id,

                product_name: item.name,

                quantity: item.qty,

                price_at_time: item.price

            }));

            await supabase.from('order_items').insert(items);



            const message = encodeURIComponent(`Finish Order #${orderId}`);

            window.open(`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}?text=${message}`, '_self');

        } catch (err) {

            console.error(err);

            showToast('Failed to start checkout. Please try again.', 'error');

        } finally {

            setPlacing(false);

        }

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

            const fullAddress = `${checkoutForm.address}, ${checkoutForm.city} - ${checkoutForm.pincode}`.trim();

            const finalTotal = cartTotal + (cartTotal >= 2000 ? 0 : 99);



            const { error: orderError } = await supabase.from('orders').insert({

                id: orderId,

                customer_phone: fullPhone,

                customer_name: checkoutForm.name,

                delivery_address: fullAddress,

                status: checkoutForm.paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT',

                total_amount: finalTotal,

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

                price_at_time: item.price

            }));

            await supabase.from('order_items').insert(items);



            for (const item of cart) {

                const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();

                if (prod) {

                    await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', item.id);

                }

            }



            await fetch('/api/whatsapp/order-notify', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    orderId,

                    customerPhone: fullPhone,

                    customerName: checkoutForm.name,

                    address: fullAddress,

                    items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),

                    total: finalTotal,

                    paymentMethod: checkoutForm.paymentMethod

                })

            });



            setCart([]);
            showToast('Order Placed! Redirecting to WhatsApp...', 'success');
            const message = encodeURIComponent(`please confirm is this your order in the website? Order #${orderId}`);
            window.open(`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}?text=${message}`, '_self');

        } catch (err) {

            console.error(err);

            showToast('Order failed. Please try again.', 'error');

        } finally {

            setPlacing(false);

        }

    }



    function goToWhatsApp(orderId) {

        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);

        window.open(`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}?text=${message}`, '_self');

    }



    // ── RENDER ──



    return (

        <div className={styles.shopApp}>

            {/* Toast */}

            {toast && (

                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>

                    {toast.message}

                </div>

            )}



            {/* Header */}

            <header className={styles.header}>

                <div className={styles.headerInner}>

                    <div className={styles.logo}>

                        <span className={styles.logoIcon}>🌸</span>

                        <div>

                            <div className={styles.logoName}>Cast Prince</div>

                            <div className={styles.logoTagline}>Premium Silk & Cotton Collection</div>

                        </div>

                    </div>

                    <div className={styles.headerActions}>

                        {view !== 'success' && (

                            <>

                                {view !== 'shop' && (

                                    <button onClick={() => setView('shop')} className={styles.backBtn}>

                                        ← Back to Shop

                                    </button>

                                )}

                                {view === 'shop' && cart.length > 0 && (

                                    <button onClick={() => setView('cart')} className={styles.cartBtn}>

                                        <span className={styles.cartIcon}>🛒</span>

                                        <span>My Cart</span>

                                        <span className={styles.cartBadge}>{cartCount}</span>

                                    </button>

                                )}

                            </>

                        )}

                    </div>

                </div>

            </header>



            <main className={styles.main}>

                {/* ── SHOP VIEW ────────────────────────────────────────────────────── */}

                {view === 'shop' && (

                    <>

                        <div className={styles.hero}>

                            <div className={styles.heroContent}>

                                <div className={styles.heroTag}>✨ New Arrivals 2026</div>

                                <h1 className={styles.heroTitle}>Drape Yourself in Elegance</h1>

                                <p className={styles.heroSubtitle}>Handpicked silk & cotton sarees crafted for the modern woman</p>

                                <div className={styles.heroStats}>

                                    <div className={styles.heroStat}><span>500+</span><small>Designs</small></div>

                                    <div className={styles.heroDivider} />

                                    <div className={styles.heroStat}><span>100%</span><small>Authentic</small></div>

                                    <div className={styles.heroDivider} />

                                    <div className={styles.heroStat}><span>Free</span><small>Shipping ₹2000+</small></div>

                                </div>

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

                        ) : filteredProducts.length === 0 ? (

                            <div className={styles.emptyState}>

                                <div className={styles.emptyIcon}>🌸</div>

                                <h3>No sarees found</h3>

                                <p>Try a different search or category</p>

                            </div>

                        ) : (

                            <div className={styles.productsGrid}>

                                {filteredProducts.map(product => (

                                    <div key={product.id} className={styles.productCard}>

                                        <div className={styles.productImageWrap} onClick={() => setSelectedProduct(product)}>

                                            <img

                                                src={product.image_url || `https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80`}

                                                alt={product.name}

                                                className={styles.productImage}

                                                loading="lazy"

                                                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80'; }}

                                            />

                                            {product.stock < 5 && product.stock > 0 && <div className={styles.stockBadge}>Only {product.stock} left!</div>}

                                            {product.stock === 0 && <div className={styles.outOfStockOverlay}>Out of Stock</div>}

                                            {product.discount > 0 && <div className={styles.discountBadge}>{product.discount}% OFF</div>}

                                        </div>

                                        <div className={styles.productInfo}>

                                            <div className={styles.productCategory}>{product.category}</div>

                                            <h3 className={styles.productName} onClick={() => setSelectedProduct(product)}>{product.name}</h3>

                                            <div className={styles.productPricing}>

                                                <span className={styles.productPrice}>₹{product.price.toLocaleString()}</span>

                                                {product.discount > 0 && (

                                                    <span className={styles.originalPrice}>₹{Math.round(product.price / (1 - product.discount / 100)).toLocaleString()}</span>

                                                )}

                                            </div>

                                            <button

                                                onClick={() => addToCart(product)}

                                                disabled={product.stock === 0}

                                                className={`${styles.addToCartBtn} ${product.stock === 0 ? styles.addToCartDisabled : ''}`}

                                            >

                                                {product.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}

                                            </button>

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}



                        {cart.length > 0 && (

                            <div className={styles.floatingCart} onClick={() => setView('cart')}>

                                <span>🛒 {cartCount} item{cartCount > 1 ? 's' : ''}</span>

                                <span className={styles.floatingCartPrice}>₹{cartTotal.toLocaleString()}</span>

                                <span className={styles.floatingCartCta}>View Cart →</span>

                            </div>

                        )}

                    </>

                )}



                {/* ── CART VIEW ─────────────────────────────────────────────────────── */}

                {view === 'cart' && (

                    <div className={styles.cartView}>

                        <div className={styles.sectionTitle}>

                            <h2>🛒 Your Cart <span className={styles.cartCountLabel}>({cartCount} items)</span></h2>

                        </div>

                        {cart.length === 0 ? (

                            <div className={styles.emptyState}>

                                <div className={styles.emptyIcon}>🛒</div>

                                <h3>Your cart is empty</h3>

                                <button onClick={() => setView('shop')} className={styles.shopNowBtn}>Browse Sarees</button>

                            </div>

                        ) : (

                            <div className={styles.cartLayout}>

                                <div className={styles.cartItems}>

                                    {cart.map(item => (

                                        <div key={item.id} className={styles.cartItem}>

                                            <img src={item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'} alt={item.name} className={styles.cartItemImage} />

                                            <div className={styles.cartItemDetails}>

                                                <div className={styles.cartItemCategory}>{item.category}</div>

                                                <div className={styles.cartItemName}>{item.name}</div>

                                                <div className={styles.cartItemPrice}>₹{item.price.toLocaleString()} each</div>

                                                <div className={styles.qtyControl}>

                                                    <button onClick={() => updateQty(item.id, -1)} className={styles.qtyBtn}>−</button>

                                                    <span className={styles.qtyValue}>{item.qty}</span>

                                                    <button onClick={() => updateQty(item.id, 1)} disabled={item.qty >= item.stock} className={styles.qtyBtn}>+</button>

                                                </div>

                                            </div>

                                            <div className={styles.cartItemRight}>

                                                <div className={styles.cartItemTotal}>₹{(item.price * item.qty).toLocaleString()}</div>

                                                <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>🗑️ Remove</button>

                                            </div>

                                        </div>

                                    ))}

                                </div>

                                <div className={styles.cartSummary}>

                                    <div className={styles.summaryCard}>

                                        <h3>Order Summary</h3>

                                        <div className={styles.summaryLine}><span>Subtotal</span><span>₹{cartTotal.toLocaleString()}</span></div>

                                        <div className={styles.summaryLine}><span>Shipping</span><span className={styles.freeShipping}>{cartTotal >= 2000 ? 'FREE' : '₹99'}</span></div>

                                        <div className={styles.summaryDivider} />

                                        <div className={`${styles.summaryLine} ${styles.summaryTotal}`}><span>Total</span><span>₹{(cartTotal + (cartTotal >= 2000 ? 0 : 99)).toLocaleString()}</span></div>

                                        <button onClick={() => setView('checkout')} className={styles.checkoutBtn}>Proceed to Checkout →</button>

                                    </div>

                                </div>

                            </div>

                        )}

                    </div>

                )}



                {/* ── CHECKOUT VIEW ─────────────────────────────────────────────────── */}

                {view === 'checkout' && (

                    <div className={styles.checkoutView}>

                        <div className={styles.sectionTitle}><h2>📦 Checkout</h2></div>

                        <div className={styles.checkoutLayout}>

                            <div className={styles.checkoutForm}>

                                <div className={styles.formSection}>

                                    <h3>Delivery Details</h3>

                                    <div className={styles.formGrid}>

                                        <div className={styles.formGroup}>

                                            <label>Full Name *</label>

                                            <input type="text" placeholder="Your full name" value={checkoutForm.name} onChange={e => setCheckoutForm(p => ({ ...p, name: e.target.value }))} className={styles.formInput} />

                                        </div>

                                        <div className={styles.formGroup}>

                                            <label>WhatsApp / Phone *</label>

                                            <input type="tel" placeholder="10-digit mobile number" value={checkoutForm.phone} onChange={e => setCheckoutForm(p => ({ ...p, phone: e.target.value }))} className={styles.formInput} />

                                        </div>

                                    </div>

                                    <div className={styles.formGroup}>

                                        <label>Street Address *</label>

                                        <textarea placeholder="House No., Street, Landmark" value={checkoutForm.address} onChange={e => setCheckoutForm(p => ({ ...p, address: e.target.value }))} rows={2} className={styles.formTextarea} />

                                    </div>

                                    <div className={styles.formGrid}>

                                        <div className={styles.formGroup}><label>City</label><input type="text" placeholder="City" value={checkoutForm.city} onChange={e => setCheckoutForm(p => ({ ...p, city: e.target.value }))} className={styles.formInput} /></div>

                                        <div className={styles.formGroup}><label>Pincode</label><input type="text" placeholder="6-digit pincode" value={checkoutForm.pincode} onChange={e => setCheckoutForm(p => ({ ...p, pincode: e.target.value }))} className={styles.formInput} /></div>

                                    </div>

                                </div>

                                <div className={styles.formSection}>

                                    <h3>Payment Method</h3>

                                    <div className={styles.paymentOptions}>

                                        <label className={`${styles.paymentOption} ${checkoutForm.paymentMethod === 'COD' ? styles.paymentOptionActive : ''}`}>

                                            <input type="radio" value="COD" checked={checkoutForm.paymentMethod === 'COD'} onChange={e => setCheckoutForm(p => ({ ...p, paymentMethod: e.target.value }))} hidden />

                                            <span className={styles.payIcon}>💵</span><div><div className={styles.payTitle}>Cash on Delivery</div></div>

                                        </label>

                                        <label className={`${styles.paymentOption} ${checkoutForm.paymentMethod === 'UPI' ? styles.paymentOptionActive : ''}`}>

                                            <input type="radio" value="UPI" checked={checkoutForm.paymentMethod === 'UPI'} onChange={e => setCheckoutForm(p => ({ ...p, paymentMethod: e.target.value }))} hidden />

                                            <span className={styles.payIcon}>📲</span><div><div className={styles.payTitle}>UPI / Online</div></div>

                                        </label>

                                    </div>

                                </div>

                            </div>

                            <div className={styles.checkoutSummary}>

                                <div className={styles.summaryCard}>

                                    <h3>Order Summary</h3>

                                    {cart.map(item => (

                                        <div key={item.id} className={styles.summaryItem}><span>{item.name} x{item.qty}</span><span>₹{(item.price * item.qty).toLocaleString()}</span></div>

                                    ))}

                                    <div className={styles.summaryDivider} />

                                    <div className={`${styles.summaryLine} ${styles.summaryTotal}`}><span>Grand Total</span><span>₹{(cartTotal + (cartTotal >= 2000 ? 0 : 99)).toLocaleString()}</span></div>

                                    <button onClick={placeOrder} disabled={placing} className={styles.placeOrderBtn}>{placing ? '⏳ Placing Order...' : '✅ Place Order'}</button>

                                </div>

                            </div>

                        </div>

                    </div>

                )}



                {/* ── SUCCESS VIEW ─────────────────────────────────────────────────── */}

                {view === 'success' && orderData && (

                    <div className={styles.successView}>

                        <div className={styles.successCard}>

                            <div className={styles.successIcon}>🎉</div>

                            <h2 className={styles.successTitle}>Order Placed Successfully!</h2>

                            <p className={styles.successMsg}>Thank you, <strong>{orderData.customerName}</strong>!</p>

                            <div className={styles.orderDetails}>

                                <div className={styles.orderDetailRow}><span>Order ID</span><strong>#{orderData.orderId}</strong></div>

                                <div className={styles.orderDetailRow}><span>Total</span><strong>₹{orderData.total.toLocaleString()}</strong></div>

                            </div>

                            <div className={styles.successActions}>

                                <button onClick={() => goToWhatsApp(orderData.orderId)} className={styles.waBtn}>Open WhatsApp</button>

                                <button onClick={() => { setView('shop'); setOrderData(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={styles.shopAgainBtn}>Shop More</button>

                            </div>

                        </div>

                    </div>

                )}

            </main>



            {/* Product Modal */}

            {selectedProduct && (

                <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>

                    <div className={styles.modal} onClick={e => e.stopPropagation()}>

                        <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}>✕</button>

                        <div className={styles.modalContent}>

                            <div className={styles.modalImageWrap}>

                                <img src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80'} alt={selectedProduct.name} className={styles.modalImage} />

                            </div>

                            <div className={styles.modalDetails}>

                                <div className={styles.modalCategory}>{selectedProduct.category}</div>

                                <h2 className={styles.modalTitle}>{selectedProduct.name}</h2>

                                <div className={styles.modalPricing}>

                                    <span className={styles.modalPrice}>₹{selectedProduct.price.toLocaleString()}</span>

                                </div>

                                <p className={styles.modalDesc}>{selectedProduct.description}</p>

                                <button

                                    onClick={() => addToCart(selectedProduct)}

                                    disabled={selectedProduct.stock === 0}

                                    className={styles.modalAddBtn}

                                >

                                    {selectedProduct.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}



            <footer className={styles.footer}>

                <div className={styles.footerContent}>

                    <div>🌸 Cast Prince — Premium Ethnic Wear</div>

                    <div>📱 WhatsApp: <a href={`https://wa.me/15551678232`} target="_self" style={{ color: '#25D366' }}>+1 555 167 8232</a></div>

                </div>

            </footer>

        </div>

    );

}



export default function ShopPage() {

    return (

        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>Loading...</div>}>

            <ShopContent />

        </Suspense>

    );

}

