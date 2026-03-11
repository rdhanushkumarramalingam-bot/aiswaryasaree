'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Package, MapPin, Truck, CheckCircle, Clock, ChevronLeft } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './track.module.css';

function TrackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderIdParam = searchParams.get('id') || '';

    const { supabase, showToast } = useShop();
    const [orderId, setOrderId] = useState(orderIdParam);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (orderIdParam) {
            fetchTrackingOrder(orderIdParam);
        }
    }, [orderIdParam]);

    async function fetchTrackingOrder(idToTrack) {
        const id = idToTrack || orderId;
        if (!id) return;
        setLoading(true);
        setOrder(null);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', id)
                .single();

            if (data) setOrder(data);
            else showToast('Order not found', 'error');
        } catch (err) {
            console.error('Tracking Error:', err);
            showToast('Failed to track order', 'error');
        } finally {
            setLoading(false);
        }
    }

    const getStatusIndex = (status) => {
        const stages = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
        return stages.indexOf(status);
    };

    const statusIndex = order ? getStatusIndex(order.status) : -1;

    return (
        <div className={styles.trackContainer}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <ChevronLeft size={20} /> Back
            </button>
            <div className={styles.trackHeader}>
                <h1>Track Order</h1>
                <p>Enter your order ID to see the latest status of your purchase.</p>

                <div className={styles.searchBar}>
                    <div className={styles.searchInputWrap}>
                        <Search size={22} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Enter Order ID (e.g. WEB-123456)"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                        />
                    </div>
                    <button onClick={() => fetchTrackingOrder()} disabled={loading} className={styles.trackBtn}>
                        {loading ? 'Searching...' : 'Track My Order'}
                    </button>
                </div>
            </div>

            {order ? (
                <div className={styles.trackingResult}>
                    <div className={styles.orderSummary}>
                        <div className={styles.summaryTop}>
                            <div className={styles.orderIdentity}>
                                <span className={styles.idLabel}>ORDER ID</span>
                                <h3 className={styles.idValue}>#{order.id}</h3>
                            </div>
                            <div className={styles.orderStatusBadge}>
                                <span className={`${styles.badge} ${styles[`status${order.status}`]}`}>{order.status}</span>
                            </div>
                        </div>

                        <div className={styles.timeline}>
                            {[
                                { stage: 'PLACED', label: 'Order Placed', icon: <Package size={20} /> },
                                { stage: 'CONFIRMED', label: 'Confirmed', icon: <CheckCircle size={20} /> },
                                { stage: 'SHIPPED', label: 'Shipped', icon: <Truck size={20} /> },
                                { stage: 'DELIVERED', label: 'Delivered', icon: <MapPin size={20} /> }
                            ].map((step, idx) => (
                                <div key={idx} className={`${styles.timelineStep} ${idx <= statusIndex ? styles.stepActive : ''}`}>
                                    <div className={styles.stepIcon}>{step.icon}</div>
                                    <div className={styles.stepInfo}>
                                        <div className={styles.stepLabel}>{step.label}</div>
                                        <div className={styles.stepDate}>{idx === statusIndex ? 'In Progress' : (idx < statusIndex ? 'Completed' : 'Pending')}</div>
                                    </div>
                                    {idx < 3 && <div className={`${styles.timelineLine} ${idx < statusIndex ? styles.lineActive : ''}`} />}
                                </div>
                            ))}
                        </div>

                        {order.tracking_number && (
                            <div className={styles.shippingSection}>
                                <h3>Shipping Information</h3>
                                <div className={styles.shippingGrid}>
                                    <div className={styles.shipInfoItem}>
                                        <strong>Carrier</strong>
                                        <span>{order.courier_name || 'BlueDart / Delhivery'}</span>
                                    </div>
                                    <div className={styles.shipInfoItem}>
                                        <strong>Tracking Number</strong>
                                        <span>{order.tracking_number}</span>
                                    </div>
                                </div>
                                {order.tracking_url && (
                                    <a href={order.tracking_url} target="_blank" className={styles.externalTrackLink}>
                                        Track on Carrier Website →
                                    </a>
                                )}
                            </div>
                        )}

                        <div className={styles.orderItems}>
                            <h3>Order Items</h3>
                            <div className={styles.itemsList}>
                                {order.order_items?.map(item => (
                                    <div key={item.id} className={styles.itemRow}>
                                        <span>{item.product_name} x {item.quantity}</span>
                                        <span>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.totalRow}>
                                <span>Grand Total</span>
                                <span>₹{(order.total_amount || 0).toLocaleString()}.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : !loading && orderIdParam && (
                <div className={styles.noOrderPlaceholder}>
                    <Package size={48} />
                    <p>Order not found. Please double-check your Order ID.</p>
                </div>
            )}
        </div>
    );
}

export default function TrackOrderPage() {
    return (
        <Suspense fallback={<div>Loading Tracking...</div>}>
            <TrackContent />
        </Suspense>
    );
}
