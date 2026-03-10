'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, ShoppingBag, Truck, CreditCard, ChevronLeft } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './checkout.module.css';

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, cartTotal, checkoutForm, setCheckoutForm, taxDetails, placeOrder } = useShop();
    const [placing, setPlacing] = useState(false);
    const [orderData, setOrderData] = useState(null);

    const states = ["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"];

    const handlePlaceOrder = async () => {
        setPlacing(true);
        try {
            const data = await placeOrder();
            if (data) setOrderData(data);
        } catch (err) {
            // Error is handled in context
        } finally {
            setPlacing(false);
        }
    };

    const goToWhatsApp = (orderId) => {
        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);
        const bizPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '917558189732';
        window.open(`https://wa.me/${bizPhone}?text=${message}`, '_blank');
    };

    if (orderData) {
        return (
            <div className={styles.successView}>
                <div className={styles.successCard}>
                    <div className={styles.successBadge}>✅</div>
                    <h2>Order Confirmed!</h2>
                    <p>Thank you, {orderData.customerName}!</p>
                    <div className={styles.successMeta}>
                        <div className={styles.orderIdTag}>Order ID: #{orderData.orderId}</div>
                        <div className={styles.successTotal}>
                            <span>Amount To Pay:</span>
                            <span>₹{orderData.total.toLocaleString()}.00</span>
                        </div>
                    </div>
                    <button onClick={() => goToWhatsApp(orderData.orderId)} className={styles.waBtn}>
                        <MessageCircle size={18} /> Confirm on WhatsApp
                    </button>
                    <Link href="/shop" className={styles.secondaryBtn}>Back to Shop</Link>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className={styles.emptyCheckout}>
                <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                <h3>Your cart is empty</h3>
                <p>Add some items before checking out.</p>
                <Link href="/shop" className={styles.primaryBtn}>Return to Shop</Link>
            </div>
        );
    }

    return (
        <div className={styles.checkoutLayout}>
            <div className={styles.checkoutLeft}>
                <section className={styles.checkoutCard}>
                    <h3 className={styles.cardTitle}>Shipping Details</h3>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>FULL NAME</label>
                            <input type="text" value={checkoutForm.name} onChange={e => setCheckoutForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter your full name" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>WHATSAPP NUMBER</label>
                            <input type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone number" />
                        </div>
                    </div>

                    <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                        <label>SHIPPING ADDRESS</label>
                        <textarea value={checkoutForm.address} onChange={e => setCheckoutForm(p => ({ ...p, address: e.target.value }))} placeholder="House No, Building, Street, Area..." rows={2} />
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>CITY / TOWN</label>
                            <input type="text" value={checkoutForm.city} onChange={e => setCheckoutForm(p => ({ ...p, city: e.target.value }))} placeholder="City name" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>STATE</label>
                            <select value={checkoutForm.state} onChange={e => setCheckoutForm(p => ({ ...p, state: e.target.value }))}>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>PINCODE</label>
                            <input type="text" value={checkoutForm.pincode} onChange={e => setCheckoutForm(p => ({ ...p, pincode: e.target.value }))} placeholder="6-digit pincode" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>COUNTRY</label>
                            <select disabled><option>India</option></select>
                        </div>
                    </div>
                </section>

                <section className={styles.checkoutCard} style={{ marginTop: '2rem' }}>
                    <h3 className={styles.cardTitle}>Payment Method</h3>
                    <div className={styles.paymentOptions}>
                        <label className={`${styles.paymentRadio} ${checkoutForm.paymentMethod === 'COD' ? styles.activeRadio : ''}`}>
                            <input type="radio" value="COD" checked={checkoutForm.paymentMethod === 'COD'} onChange={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'COD' }))} />
                            <div className={styles.radioInfo}>
                                <Truck size={20} />
                                <div>
                                    <div className={styles.radioTitle}>Cash on Delivery</div>
                                    <div className={styles.radioDesc}>Pay when you receive the product</div>
                                </div>
                            </div>
                        </label>
                        <label className={`${styles.paymentRadio} ${checkoutForm.paymentMethod === 'ONLINE' ? styles.activeRadio : ''}`}>
                            <input type="radio" value="ONLINE" checked={checkoutForm.paymentMethod === 'ONLINE'} onChange={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'ONLINE' }))} />
                            <div className={styles.radioInfo}>
                                <CreditCard size={20} />
                                <div>
                                    <div className={styles.radioTitle}>UPI / Online Payment</div>
                                    <div className={styles.radioDesc}>Secure payment via UPI or Cards</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </section>
            </div>

            <aside className={styles.checkoutRight}>
                <div className={styles.summaryCard}>
                    <h3 className={styles.cardTitle}>Order Summary</h3>
                    <div className={styles.itemList}>
                        {cart.map((item, i) => (
                            <div key={i} className={styles.summaryItem}>
                                <span>{item.name} x {item.qty}</span>
                                <span>₹{(item.price * item.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.summaryDivider} />

                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>₹{cartTotal.toLocaleString()}</span>
                    </div>

                    {taxDetails.cgst > 0 && (
                        <div className={styles.summaryRow}>
                            <span>CGST (2.5%)</span>
                            <span>₹{taxDetails.cgst.toLocaleString()}</span>
                        </div>
                    )}
                    {taxDetails.sgst > 0 && (
                        <div className={styles.summaryRow}>
                            <span>SGST (2.5%)</span>
                            <span>₹{taxDetails.sgst.toLocaleString()}</span>
                        </div>
                    )}
                    {taxDetails.igst > 0 && (
                        <div className={styles.summaryRow}>
                            <span>IGST (5%)</span>
                            <span>₹{taxDetails.igst.toLocaleString()}</span>
                        </div>
                    )}

                    <div className={styles.summaryRow}>
                        <span>Shipping</span>
                        <span className={taxDetails.shipping === 0 ? styles.freeText : ''}>
                            {taxDetails.shipping === 0 ? 'FREE' : `₹${taxDetails.shipping.toLocaleString()}`}
                        </span>
                    </div>

                    <div className={styles.totalRow}>
                        <span>Total</span>
                        <div className={styles.totalBox}>
                            <div className={styles.totalPrice}>₹{taxDetails.totalOrder.toLocaleString()}</div>
                            <div className={styles.taxNote}>Inclusive of taxes</div>
                        </div>
                    </div>

                    <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={placing}>
                        {placing ? 'Processing Order...' : 'Place Order Now'}
                    </button>

                    <p className={styles.termsNote}>
                        By placing your order, you agree to our Terms of Use and Privacy Policy.
                    </p>
                </div>
            </aside>
        </div>
    );
}
