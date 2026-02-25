// ════════════════════════════════════════════════════════════════════════════════
//  AISWARYA SAREES — WHATSAPP BUSINESS BOT (Premium Edition)
// ════════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { jsPDF } from "jspdf";

// ─── 1. CONFIGURATION & CLIENTS ───────────────────────────────────────────────

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// ─── PREMIUM IMAGE ASSETS ─────────────────────────────────────────────────────

// Updated with distinct Saree visuals
// Updated with 15 Distinct Saree Colors/Styles
const PREMIUM_IMAGES = [
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85', // Red
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=85', // Blue
    'https://images.unsplash.com/photo-1601055903647-87ac54bf14e0?w=600&q=85', // Pink
    'https://images.unsplash.com/photo-1621644820935-46b7a0808e04?w=600&q=85', // Green
    'https://images.unsplash.com/photo-1619623249764-a0c50c18435d?w=600&q=85', // Orange
    'https://images.unsplash.com/photo-1617325247661-675ab4b64ae4?w=600&q=85', // Silver
    'https://images.unsplash.com/photo-1596472481622-c4349f7b1129?w=600&q=85', // Purple
    'https://images.unsplash.com/photo-1628169222442-83b6f272c72b?w=600&q=85', // Gold
    'https://images.unsplash.com/photo-1518049362260-00ad8452bc21?w=600&q=85', // Teal
    'https://images.unsplash.com/photo-1509319117193-518da0485f73?w=600&q=85', // Maroon
    'https://images.unsplash.com/photo-1632205561578-1a52c3c97692?w=600&q=85', // Pattern
    'https://images.unsplash.com/photo-1582234033100-880026e6e22f?w=600&q=85', // Light Pink
    'https://images.unsplash.com/photo-1629814234057-07447693d56f?w=600&q=85', // Dark Blue
    'https://images.unsplash.com/photo-1574620021303-346d0a1b023e?w=600&q=85', // Yellow
    'https://images.unsplash.com/photo-1500917293049-61da1dc08358?w=600&q=85', // Black
];

// ─── STREAM CONTROL ───────────────────────────────────────────────────────────
const activeStreams = new Map();

function cancelStream(to) {
    if (activeStreams.has(to)) {
        console.log(`[WA] Stopping stream for ${to}`);
        activeStreams.delete(to);
    }
}

function startStream(to) {
    const id = Date.now().toString();
    activeStreams.set(to, id);
    return id;
}

function isStreamActive(to, id) {
    return activeStreams.get(to) === id;
}

// In-memory config cache (5 min TTL) — avoids repeated Supabase calls for same key
const configCache = new Map();
const CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

async function getConfig(key, fallback) {
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.ts < CONFIG_TTL) return cached.value;

    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    // Replace literal \n from database with actual newline characters
    const raw = data?.value || fallback;
    const value = raw.replace(/\\n/g, '\n');

    configCache.set(key, { value, ts: Date.now() });
    return value;
}

// Deterministic image selector based on Product ID
function getPremiumImage(product) {
    if (product.image_url && product.image_url.startsWith('http')) return product.image_url;
    let hash = 0;
    const str = product.id || product.name || 'default';
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const index = Math.abs(hash) % PREMIUM_IMAGES.length;
    return PREMIUM_IMAGES[index];
}

// ─── 2. WHATSAPP API HELPERS ──────────────────────────────────────────────────

export async function sendRawMessage(to, payload) {
    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) console.error('❌ WA API Error:', JSON.stringify(data.error));
        return data;
    } catch (error) { console.error('❌ Network Error:', error); }
}

export async function sendText(to, text) {
    // Ensure literal \n strings become real newlines (safety net)
    const safeText = text.replace(/\\n/g, '\n');
    return sendRawMessage(to, { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: safeText, preview_url: true } });
}

export async function sendImageButtons(to, imageUrl, bodyText, buttons) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "button", header: { type: "image", image: { link: imageUrl } },
            body: { text: bodyText },
            action: { buttons: buttons.map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })) }
        }
    });
}

export async function sendButtons(to, bodyText, buttons) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "button", body: { text: bodyText },
            action: { buttons: buttons.map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })) }
        }
    });
}

export async function sendList(to, headerText, bodyText, buttonLabel, sections, footerText = "Aiswarya Sarees • Premium Collection") {
    const finalSections = Array.isArray(sections) && sections[0].rows ? sections : [{ title: "Options", rows: sections }];
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "list", header: { type: "text", text: headerText },
            body: { text: bodyText }, footer: { text: footerText },
            action: { button: buttonLabel, sections: finalSections }
        }
    });
}

export async function sendDocument(to, link, caption, filename) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "document",
        document: { link: link, caption: caption, filename: filename }
    });
}


// ─── 3. CART MANAGEMENT & STOCK ───────────────────────────────────────────────

async function getCart(phone) {
    const { data } = await supabase.from('whatsapp_cart').select('*').eq('phone', phone).order('created_at', { ascending: true });
    return data || [];
}

async function addToCart(phone, product, quantity = 1) {
    const { data: existing } = await supabase.from('whatsapp_cart').select('*').eq('phone', phone).eq('product_id', product.id).single();
    if (existing) await supabase.from('whatsapp_cart').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    else await supabase.from('whatsapp_cart').insert({ phone, product_id: product.id, product_name: product.name, price: product.price, quantity, image_url: product.image_url });
}

async function clearCart(phone) {
    await supabase.from('whatsapp_cart').delete().eq('phone', phone);
}

// Deduct stock for all items in an order
async function deductStock(orderId) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (items) {
        for (const item of items) {
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product) {
                const newStock = Math.max(0, product.stock - item.quantity);
                await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
            }
        }
    }
}

// ─── 4. PDF INVOICE ───────────────────────────────────────────────────────────

async function generateAndUploadInvoice(order) {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22); doc.text("AISWARYA SAREES", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Order ID: #${order.id}`, 15, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 40);

        // Customer Info
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 15, 50);
        doc.setFont("helvetica", "normal");
        const name = order.customer_name || 'Valued Customer';
        const address = order.delivery_address || 'Address provided';
        doc.text(name, 15, 55);

        const splitAddress = doc.splitTextToSize(address, 80);
        doc.text(splitAddress, 15, 60);

        let y = 85;

        // Items
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y, 190, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Item", 15, y + 6);
        doc.text("Qty", 140, y + 6, { align: "right" });
        doc.text("Price", 170, y + 6, { align: "right" });
        doc.text("Total", 195, y + 6, { align: "right" });

        y += 14;
        doc.setFont("helvetica", "normal");

        let grandTotal = 0;
        if (order.order_items) {
            order.order_items.forEach(item => {
                const total = item.price_at_time * item.quantity;
                grandTotal += total;
                doc.text(item.product_name.substring(0, 35), 15, y);
                doc.text(String(item.quantity), 140, y, { align: "right" });
                doc.text(item.price_at_time.toLocaleString(), 170, y, { align: "right" });
                doc.text(total.toLocaleString(), 195, y, { align: "right" });
                y += 8;
            });
        }

        y += 5;
        doc.line(10, y, 200, y);
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Grand Total: Rs. ${grandTotal.toLocaleString()}`, 195, y, { align: "right" });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        const fileName = `invoice_${order.id}.pdf`;
        const { error } = await supabase.storage.from('invoices').upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (error) return null;
        const { data } = supabase.storage.from('invoices').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (e) { console.error(e); return null; }
}

// ─── 5. FLOW FUNCTIONS ───────────────────────────────────────────────────────

export async function sendMainMenu(to) {
    const welcomeMsg = await getConfig('wa_welcome_message',
        "🌸 *Welcome to Aiswarya Sarees!*\n\nDiscover our premium collection of silk & cotton sarees."
    );
    const welcomeImg = await getConfig('wa_welcome_image',
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85"
    );

    // Build shop URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(to)}`;

    // ── Message 1: Welcome image + NATIVE SHOP BUTTON ──
    // Using cta_url is the most integrated way to launch the store.
    await sendRawMessage(to, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
            type: "cta_url",
            header: {
                type: "image",
                image: { link: welcomeImg }
            },
            body: { text: welcomeMsg + "\n\nTap below to open our store natively in the app." },
            footer: { text: "Premium Shopping Experience" },
            action: {
                name: "cta_url",
                parameters: {
                    display_text: "🛍️ Open Store",
                    url: shopUrl
                }
            }
        }
    });

    // ── Message 2: Quick actions ──
    await sendButtons(to, "Manage your orders:", [
        { id: "menu_track", title: "My Orders" },
        { id: "menu_contact", title: "Contact Us" }
    ]);
}




export async function sendCatalog(to) {
    const header = await getConfig('wa_catalog_header', "PREMIUM COLLECTIONS");
    const body = await getConfig('wa_catalog_body', "Curated just for you:");

    await sendList(to, header, body, "View Categories", [
        { id: "cat_silk", title: "✨ Royal Silk", description: "Kanjivaram, Banarasi" },
        { id: "cat_cotton", title: "🌿 Elegant Cotton", description: "Handloom Comfort" },
        { id: "cat_designer", title: "💎 Designer Studio", description: "Party & Bridal" },
        { id: "cat_all", title: "🌟 View All", description: "Full Inventory" }
    ]);
}

const PAGE_SIZE = 50;

export async function sendProductsByCategory(to, categoryIdRaw, startOffset = 0) {
    const categoryId = categoryIdRaw.replace('page_', '').replace(/_\d+$/, ''); // clean ID

    let searchTerm = '';
    let categoryName = 'Collection';
    if (categoryId.includes('silk')) { searchTerm = 'Silk'; categoryName = 'Royal Silk'; }
    else if (categoryId.includes('cotton')) { searchTerm = 'Cotton'; categoryName = 'Cotton'; }
    else if (categoryId.includes('designer')) { searchTerm = 'Designer'; categoryName = 'Designer'; }
    else if (categoryId.includes('all')) { searchTerm = ''; categoryName = 'Full Inventory'; }

    if (startOffset === 0) await sendText(to, `✨ Loading *${categoryName}*...`);

    console.log(`[WA] Fetching products: cat=${categoryId}, search=${searchTerm}, offset=${startOffset}`);

    let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (searchTerm) query = query.ilike('category', `%${searchTerm}%`);

    // Start Stream Tracker
    const streamId = startStream(to);

    let { data: products, count } = await query.order('created_at', { ascending: false }).range(startOffset, startOffset + PAGE_SIZE - 1);

    if (!products || products.length === 0) {
        if (startOffset === 0) {
            // Fallback: try fetching any products without filter
            console.log('[WA] specific query returned 0, trying fallback...');
            products = (await supabase.from('products').select('*').limit(3)).data || [];
        } else {
            return sendText(to, "⚠️ No more items in this collection.");
        }
    }

    console.log(`[WA] Found ${products?.length} products (Total: ${count})`);

    let sentCount = 0;
    for (const p of products) {
        // CHECK IF STREAM IS STILL ACTIVE
        if (!isStreamActive(to, streamId)) {
            console.log('[WA] Stream cancelled explicitly for', to);
            return;
        }

        const stockStatus = p.stock < 1 ? "❌ OUT OF STOCK" : p.stock < 5 ? `⚠️ Only ${p.stock} left!` : "✅ In Stock";
        const caption = `✨ *${p.name}*\n${p.description || ''}\n\n💎 *₹${p.price.toLocaleString()}*\n${stockStatus}`;

        const buttons = p.stock > 0 ? [{ id: `addcart_${p.id}`, title: "🛒 Add to Bag" }] : [{ id: "menu_browse", title: "Main Menu" }];
        try {
            await sendImageButtons(to, getPremiumImage(p), caption, buttons);
            sentCount++;
        } catch (err) {
            console.error(`[WA] Failed to send image for ${p.id}`, err);
            // Fallback to text if image fails
            await sendText(to, caption + "\n[Image upload failed]");
        }
        await new Promise(r => setTimeout(r, 800));
    }

    if (!isStreamActive(to, streamId)) return;

    const nextOffset = startOffset + sentCount; // Use actual sent count safe
    const hasMore = count > (startOffset + PAGE_SIZE);

    const optionButtons = [];
    optionButtons.push({ id: "menu_browse", title: "📂 Go to Category" });
    optionButtons.push({ id: "menu_track", title: "📋 View Orders" });
    optionButtons.push({ id: "menu_cart", title: "👜 View Cart" });

    // Ensure we don't send "Load More" if we just showed everything.
    // User requested "show all sarees once and ask what is next action"
    if (hasMore) {
        // If there are truly more products (e.g. > 50), show load more
        await sendButtons(to, `👇 Showing ${products.length} items. `, [
            { id: `page_${categoryId}_${nextOffset}`, title: "📜 Load More" },
            { id: "menu_browse", title: "📂 Categories" }
        ]);
    } else {
        await sendButtons(to, "✅ That's all the sarees!\n\nWhat would you like to do next?", optionButtons);
    }
}

export async function handleAddToCart(to, productIdRaw) {
    const productId = productIdRaw.replace('addcart_', '');
    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
    if (!product || product.stock < 1) return sendText(to, "⚠️ Sorry, this item is out of stock.");

    await addToCart(to, product, 1);

    // Fetch updated quantity
    const { data: cartItem } = await supabase.from('whatsapp_cart').select('quantity').eq('phone', to).eq('product_id', productId).single();
    const qty = cartItem ? cartItem.quantity : 1;

    await sendButtons(to, `✅ *Added to Bag*\n${product.name}\nQty in Bag: ${qty}`, [
        { id: `qty_inc_${productId}`, title: "➕ Add Another" },
        { id: `qty_dec_${productId}`, title: "➖ Reduce Qty" },
        { id: "menu_cart", title: "👜 View Bag" }
    ]);
}

export async function handleModifyQuantity(to, action, productId) {
    const { data: item } = await supabase.from('whatsapp_cart').select('*').eq('phone', to).eq('product_id', productId).single();
    if (!item) return sendText(to, "Item not found in bag.");

    let newQty = item.quantity;
    if (action === 'inc') newQty += 1;
    if (action === 'dec') newQty -= 1;

    if (newQty < 1) {
        await supabase.from('whatsapp_cart').delete().eq('id', item.id);
        return sendText(to, `🗑️ Removed ${item.product_name} from bag.`);
    } else {
        await supabase.from('whatsapp_cart').update({ quantity: newQty }).eq('id', item.id);

        await sendButtons(to, `✅ *Quantity Updated*\n${item.product_name}\nNew Qty: ${newQty}`, [
            { id: `qty_inc_${productId}`, title: "➕ Add Another" },
            { id: `qty_dec_${productId}`, title: "➖ Reduce Qty" },
            { id: "menu_cart", title: "👜 View Bag" }
        ]);
    }
}

export async function handleViewCart(to) {
    const cart = await getCart(to);
    if (!cart || cart.length === 0) return sendButtons(to, "Your bag is empty.", [{ id: "menu_browse", title: "🛍️ Shop Now" }]);

    let msg = `👜 *YOUR BAG*\n\n`;
    let total = 0;
    cart.forEach((item, i) => {
        total += item.price * item.quantity;
        msg += `${i + 1}. ${item.product_name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString()}\n`;
    });
    msg += `\n💎 *Total: ₹${total.toLocaleString()}*`;

    await sendButtons(to, msg, [
        { id: "start_checkout", title: "✅ Checkout" },
        { id: "menu_browse", title: "🛍️ Add More" },
        { id: "edit_cart", title: "✏️ Edit Qty / Remove" }
    ]);
}

export async function handleEditCart(to) {
    const cart = await getCart(to);
    if (!cart || cart.length === 0) return handleViewCart(to);

    const sections = [{
        title: "Select Item to Edit",
        rows: cart.map(item => ({
            id: `edit_item_${item.product_id}`,
            title: item.product_name.substring(0, 23),
            description: `Qty: ${item.quantity} | ₹${item.price * item.quantity}`
        }))
    }];

    await sendList(to, "EDIT BAG", "Select an item to change quantity or remove:", "Select Item", sections);
}

export async function handleCartItemOptions(to, productId) {
    const { data: item } = await supabase.from('whatsapp_cart').select('*').eq('phone', to).eq('product_id', productId).single();
    if (!item) return handleViewCart(to);

    await sendButtons(to, `⚙️ *Edit Item*\n${item.product_name}\nQty: ${item.quantity}`, [
        { id: `qty_inc_${productId}`, title: "➕ Increase" },
        { id: `qty_dec_${productId}`, title: "➖ Reduce" },
        { id: `remove_item_${item.id}`, title: "❌ Remove" }
    ]);
}

export async function handleRemoveItem(to, itemId) {
    await supabase.from('whatsapp_cart').delete().eq('id', itemId);
    await sendText(to, "✅ Item removed from bag.");
    await handleViewCart(to);
}

export async function startCheckout(to) {
    const cart = await getCart(to);
    if (!cart.length) return sendText(to, "Bag empty!");

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const totalAmount = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    // Initial Draft — store the WhatsApp number in whatsapp_phone so we can always find it
    await supabase.from('orders').insert({
        id: orderId,
        customer_phone: to,    // WhatsApp number (always preserved)
        customer_name: null,
        delivery_address: null,
        status: "DRAFT",
        total_amount: totalAmount,
        created_at: new Date()
    });

    // Add Items
    const orderItems = cart.map(item => ({
        order_id: orderId, product_id: item.product_id, product_name: item.product_name,
        quantity: item.quantity, price_at_time: item.price
    }));
    await supabase.from('order_items').insert(orderItems);

    // Check Previous COMPLETED Orders for Address Reuse
    // Look for any past order from this WhatsApp number that has an address
    const { data: lastOrders } = await supabase.from('orders')
        .select('customer_name, delivery_address, customer_phone')
        .eq('customer_phone', to)
        .not('delivery_address', 'is', null)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastOrder = lastOrders?.[0];
    console.log(`[WA] Checkout for ${to} — last order found:`, lastOrder ? 'YES' : 'NO');

    if (lastOrder && lastOrder.delivery_address) {
        await sendButtons(to,
            `📝 *Checkout*\n\nWe found your saved address:\n\n` +
            `👤 ${lastOrder.customer_name || 'Customer'}\n` +
            `📍 ${lastOrder.delivery_address}\n\n` +
            `Use this address?`,
            [
                { id: `use_saved_${orderId}`, title: "✅ Yes, Use This" },
                { id: `new_addr_${orderId}`, title: "✏️ Enter New Address" }
            ]
        );
    } else {
        await sendText(to,
            `📝 *Checkout - Delivery Details*\n\n` +
            `Please reply with your details in this format:\n\n` +
            `*Name, Mobile Number, Full Address*\n\n` +
            `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
        );
    }
}

export async function askPaymentMode(to, orderId) {
    await sendButtons(to, `✅ *Address Confirmed!*\n\nHow would you like to pay?`, [
        { id: `pay_upi_${orderId}`, title: "📲 UPI / Online" },
        { id: `pay_cod_${orderId}`, title: "💵 Cash on Delivery" }
    ]);
}
// Finalize Order
export async function finalizeOrder(to, method, orderId) {
    const status = method === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT';
    await supabase.from('orders').update({ status, payment_method: method }).eq('id', orderId);

    const { data: order } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();
    const total = order?.total_amount?.toLocaleString() || '0';

    if (method === 'UPI') {
        // Build UPI deep link — opens GPay / PhonePe / any UPI app with amount pre-filled
        const rawAmount = order?.total_amount || 0;
        const upiId = 'samypranesh@okicici';
        const payeeName = 'Aiswarya+Sarees';
        const note = `Order+${orderId}`;
        const upiLink = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${rawAmount}&cu=INR&tn=${note}`;

        await sendText(to,
            `📲 *UPI Payment — ₹${total}*\n\n` +
            `Tap the link below to pay via Google Pay, PhonePe or any UPI app:\n\n` +
            `👉 ${upiLink}\n\n` +
            `UPI ID: *${upiId}*\n` +
            `Amount: *₹${total}*\n` +
            `Order ID: *#${orderId}*`
        );

        // Ask customer to confirm AFTER payment — invoice sent only then
        await sendButtons(to, `⏳ After completing the UPI payment, tap below to confirm:`, [
            { id: `paid_confirm_${orderId}`, title: "✅ I Have Paid" }
        ]);

    } else {
        // COD — deduct stock, clear cart, send invoice immediately
        await clearCart(to);
        await deductStock(orderId);

        await sendText(to,
            `✅ *Order Placed — Cash on Delivery*\n\n` +
            `Order ID: *#${orderId}*\n` +
            `Total: *₹${total}*\n\n` +
            `Our team will contact you to confirm delivery.`
        );

        // Send invoice immediately for COD
        await sendText(to, "📄 Generating your invoice...");
        const invoiceUrl = await generateAndUploadInvoice(order);
        if (invoiceUrl) {
            await sendDocument(to, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
        }

        await sendText(to, "💗 Thank you for shopping with *Aiswarya Sarees*!\n\nSend *Hi* anytime to shop again.");
    }
}

// Called when UPI customer confirms payment
export async function handlePaymentConfirmed(to, orderId) {
    // Mark order as PAID
    await supabase.from('orders').update({ status: 'PAID' }).eq('id', orderId);
    await clearCart(to);
    await deductStock(orderId);

    const { data: order } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();

    await sendText(to, `✅ *Payment Confirmed! Thank you!*\n\nGenerating your invoice now...`);
    const invoiceUrl = await generateAndUploadInvoice(order);
    if (invoiceUrl) {
        await sendDocument(to, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
    } else {
        await sendText(to, `⚠️ Invoice generation failed. Please contact us with Order ID: *#${orderId}*`);
    }

    await sendText(to, "💗 Thank you for shopping with *Aiswarya Sarees*!\n\nSend *Hi* anytime to shop again.");
}

export async function handleTrackOrder(to) {
    const { data: orders } = await supabase.from('orders').select('*').eq('customer_phone', to).neq('status', 'DRAFT').order('created_at', { ascending: false }).limit(1);
    if (!orders?.length) return sendText(to, "No previous orders found.");

    const o = orders[0];
    await sendText(to, `📦 *Last Order Details*\n\nID: #${o.id}\nStatus: ${o.status}\nAmount: ₹${o.total_amount}\nDate: ${new Date(o.created_at).toLocaleDateString()}\n\nSend 'Menu' for options.`);
}

export async function handleContact(to) {
    const contactMsg = await getConfig('wa_contact_message', "📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\nsupport@aiswaryatextiles.com");
    await sendText(to, contactMsg);
}

// ─── 6. ROUTER ───────────────────────────────────────────────────────────────

// Message deduplication — WhatsApp often delivers the same webhook 2-3x
// Store processed message IDs for 5 minutes, then clean up
const processedMsgIds = new Map(); // id -> timestamp
const MSG_DEDUPE_TTL = 5 * 60 * 1000; // 5 minutes

function isDuplicate(msgId) {
    const now = Date.now();
    // Clean up old entries
    for (const [id, ts] of processedMsgIds) {
        if (now - ts > MSG_DEDUPE_TTL) processedMsgIds.delete(id);
    }
    if (processedMsgIds.has(msgId)) return true;
    processedMsgIds.set(msgId, now);
    return false;
}

export async function processIncomingMessage(body) {
    try {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return;
        const from = message.from;
        const msgType = message.type;
        const text = message.text?.body?.toLowerCase().trim();

        // 🔁 DEDUPLICATION — drop if we've already processed this message ID
        if (message.id && isDuplicate(message.id)) {
            console.log(`[WA] Duplicate message ignored: ${message.id}`);
            return;
        }

        // 🛑 Stop any active stream for this user immediately
        cancelStream(from);

        if (msgType === 'text') {
            // ─── STEP 1: Keywords ALWAYS take priority — checked before anything else ───
            const MENU_TRIGGERS = ['hi', 'hello', 'menu', 'start', '0'];
            const RESET_TRIGGERS = ['reset'];

            if (RESET_TRIGGERS.includes(text)) {
                // Reset: cancel any open draft orders and show main menu
                await supabase.from('orders').delete().eq('customer_phone', from).eq('status', 'DRAFT');
                return await sendMainMenu(from);
            }
            if (MENU_TRIGGERS.includes(text)) return await sendMainMenu(from);
            if (['cart', 'bag'].includes(text)) return await handleViewCart(from);
            if (text === 'contact') return await handleContact(from);
            if (['stop', 'cancel'].includes(text)) return await sendText(from, "✅ Stopped. Send *Hi* to start again.");

            // Handle Website Checkout Redirection
            if (text.startsWith('finish order #')) {
                const orderId = text.replace('finish order #', '').trim().toUpperCase();

                const { data: existingDraft } = await supabase.from('orders').select('id').eq('id', orderId).eq('status', 'DRAFT').single();

                if (existingDraft) {
                    await supabase.from('orders').update({
                        customer_phone: from
                    }).eq('id', orderId).eq('status', 'DRAFT');

                    await sendText(from,
                        `📝 *Complete Your Order* (#${orderId})\n\n` +
                        `Please reply with your delivery details in this format:\n\n` +
                        `*Name, Mobile Number, Full Address*\n\n` +
                        `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
                    );
                    return;
                }
            }

            // ─── STEP 2: Draft check — only reached for non-keyword messages ───
            // This captures name/mobile/address when user is in checkout flow
            const { data: draft } = await supabase
                .from('orders')
                .select('id, delivery_address')
                .eq('customer_phone', from)
                .eq('status', 'DRAFT')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (draft && !draft.delivery_address) {
                // User is replying with their delivery details
                let name = 'Valued Customer';
                let mobile = from; // default to WhatsApp number
                let address = message.text.body.trim();

                const rawBody = message.text.body.trim();

                if (rawBody.includes(',')) {
                    const parts = rawBody.split(',').map(p => p.trim());
                    if (parts.length >= 3) {
                        name = parts[0];
                        mobile = parts[1];
                        address = parts.slice(2).join(', ');
                    } else if (parts.length === 2) {
                        name = parts[0];
                        address = parts[1];
                    }
                } else if (rawBody.includes('\n')) {
                    const parts = rawBody.split('\n').map(p => p.trim()).filter(Boolean);
                    if (parts.length >= 3) {
                        name = parts[0];
                        mobile = parts[1];
                        address = parts.slice(2).join(', ');
                    } else if (parts.length === 2) {
                        name = parts[0];
                        address = parts[1];
                    }
                }

                console.log(`[WA] Saving address for draft ${draft.id}: name=${name}, mobile=${mobile}, addr=${address}`);
                await supabase.from('orders').update({
                    customer_name: name,
                    customer_phone: mobile,
                    delivery_address: address
                }).eq('id', draft.id);

                return await askPaymentMode(from, draft.id);
            }

            // ─── STEP 3: Default fallback — show main menu ───
            return await sendMainMenu(from);
        }

        if (msgType === 'interactive') {
            const reply = message.interactive;
            const id = reply.list_reply?.id || reply.button_reply?.id;

            if (id === 'menu_main') return await sendMainMenu(from);
            if (id === 'menu_shop_web') {
                // Customer tapped "Shop Now" — send the shopping website URL
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(from)}`;
                return await sendText(from,
                    `🛍️ *Open our Online Store:*\n\n👆 Tap the link below to browse & order sarees:\n\n${shopUrl}\n\n✨ You can browse our full collection, add to cart and place your order directly from the website!\n\nAfter placing your order, you'll be redirected back here with your order confirmation. 🌸`
                );
            }
            if (id === 'menu_browse') return await sendCatalog(from);
            if (id === 'menu_cart') return await handleViewCart(from);
            if (id === 'menu_track') return await handleTrackOrder(from);
            if (id === 'menu_contact') return await handleContact(from);

            if (id.startsWith('cat_')) return await sendProductsByCategory(from, id);
            if (id.startsWith('page_')) {
                const parts = id.split('_');
                // id format: page_catname_offset
                // parts: ['page', 'catname', 'offset']
                // Wait, catname might contain underscores? 
                // robust: last part is offset, rest is cat.
                const offset = parseInt(parts.pop());
                const catId = parts.join('_').replace('page_', '');
                return await sendProductsByCategory(from, catId, offset);
            }
            if (id.startsWith('addcart_')) return await handleAddToCart(from, id);


            if (id === 'clear_cart') {
                await clearCart(from);
                return await sendText(from, "Bag cleared. Send 'Hi' to start shopping again.");
            }

            if (id === 'edit_cart') return await handleEditCart(from);
            if (id.startsWith('remove_item_')) return await handleRemoveItem(from, id.replace('remove_item_', ''));

            if (id === 'start_checkout') return await startCheckout(from);

            if (id.startsWith('use_saved_')) {
                const orderId = id.replace('use_saved_', '');
                // Copy the saved address into the current draft order
                const { data: lastOrders } = await supabase.from('orders')
                    .select('customer_name, delivery_address')
                    .eq('customer_phone', from)
                    .not('delivery_address', 'is', null)
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false })
                    .limit(1);

                const lastOrder = lastOrders?.[0];
                if (lastOrder) {
                    await supabase.from('orders').update({
                        customer_name: lastOrder.customer_name,
                        delivery_address: lastOrder.delivery_address
                    }).eq('id', orderId);
                }
                return await askPaymentMode(from, orderId);
            }

            if (id.startsWith('new_addr_')) {
                // Clear any existing delivery address so draft stays open
                const orderId = id.replace('new_addr_', '');
                await supabase.from('orders').update({ delivery_address: null, customer_name: null }).eq('id', orderId);
                return await sendText(from,
                    `📝 *Enter New Delivery Details*\n\n` +
                    `Reply with your:\n_Name, Mobile Number, Full Address_\n\n` +
                    `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
                );
            }

            if (id.startsWith('qty_inc_')) return await handleModifyQuantity(from, 'inc', id.replace('qty_inc_', ''));
            if (id.startsWith('qty_dec_')) return await handleModifyQuantity(from, 'dec', id.replace('qty_dec_', ''));
            if (id.startsWith('edit_item_')) return await handleCartItemOptions(from, id.replace('edit_item_', ''));

            if (id.startsWith('pay_')) {
                const parts = id.split('_');
                return await finalizeOrder(from, parts[1].toUpperCase(), parts.slice(2).join('_'));
            }

            if (id.startsWith('paid_confirm_')) {
                const orderId = id.replace('paid_confirm_', '');
                return await handlePaymentConfirmed(from, orderId);
            }
        }

    } catch (e) {
        console.error('Handler Error:', e);
    }
}

