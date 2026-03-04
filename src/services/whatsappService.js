// ════════════════════════════════════════════════════════════════════════════════
//  Cast Prince — WHATSAPP BUSINESS BOT (Premium Edition)
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

// ─── TAX & SHIPPING RULES ──────────────────────────────────────────────────
const HOME_STATE = 'Tamil Nadu';
const GST_RATE = 0.05; // 5% for Sarees
const FLAT_SHIPPING = 100;

const INDIAN_STATES = [
    "Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh", "Telangana",
    "Maharashtra", "Gujarat", "Delhi", "West Bengal", "Uttar Pradesh",
    "Rajasthan", "Madhya Pradesh", "Bihar", "Punjab", "Haryana", "Other"
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

export async function sendList(to, headerText, bodyText, buttonLabel, sections, footerText = "Cast Prince • Premium Collection") {
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

async function addToCart(phone, product, quantity = 1, variant = null) {
    const productId = product.id;
    const variantId = variant?.id || null;

    // Check if same product+variant combo exists
    const query = supabase.from('whatsapp_cart').select('*').eq('phone', phone).eq('product_id', productId);
    if (variantId) query.eq('variant_id', variantId);
    else query.is('variant_id', null);

    const { data: existing } = await query.single();

    if (existing) {
        await supabase.from('whatsapp_cart').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    } else {
        await supabase.from('whatsapp_cart').insert({
            phone,
            product_id: productId,
            product_name: product.name,
            price: variant ? variant.price : product.price,
            quantity,
            image_url: product.image_url,
            variant_id: variantId,
            variant_name: variant ? variant.name : null
        });
    }
}

async function clearCart(phone) {
    await supabase.from('whatsapp_cart').delete().eq('phone', phone);
}

// Deduct stock for all items in an order
async function deductStock(orderId) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (items) {
        for (const item of items) {
            if (item.variant_id) {
                // Deduct from variant
                const { data: variant } = await supabase.from('product_variants')
                    .select('stock')
                    .eq('id', item.variant_id)
                    .single();
                if (variant) {
                    const newStock = Math.max(0, variant.stock - item.quantity);
                    await supabase.from('product_variants').update({ stock: newStock }).eq('id', item.variant_id);
                }
            } else {
                // Deduct from main product
                const { data: product } = await supabase.from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();
                if (product) {
                    const newStock = Math.max(0, product.stock - item.quantity);
                    await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
                }
            }
        }
    }
}

// ─── 4. PDF INVOICE ───────────────────────────────────────────────────────────

async function generateAndUploadInvoice(order) {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22); doc.text("Cast Prince", 105, 20, { align: "center" });
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
                const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
                doc.text(itemName.substring(0, 35), 15, y);
                doc.text(String(item.quantity), 140, y, { align: "right" });
                doc.text(item.price_at_time.toLocaleString(), 170, y, { align: "right" });
                doc.text(total.toLocaleString(), 195, y, { align: "right" });
                y += 8;
            });
        }

        // Summary
        doc.setFontSize(10);
        doc.text(`Subtotal:`, 140, y, { align: "right" });
        doc.text(`Rs. ${(order.subtotal || grandTotal).toLocaleString()}`, 195, y, { align: "right" });
        y += 6;

        if (order.shipping_cost > 0) {
            doc.text(`Shipping:`, 140, y, { align: "right" });
            doc.text(`Rs. ${order.shipping_cost.toLocaleString()}`, 195, y, { align: "right" });
            y += 6;
        }

        if (order.tax_amount > 0) {
            if (order.cgst > 0) {
                doc.text(`CGST (2.5%):`, 140, y, { align: "right" });
                doc.text(`Rs. ${order.cgst.toLocaleString()}`, 195, y, { align: "right" });
                y += 6;
                doc.text(`SGST (2.5%):`, 140, y, { align: "right" });
                doc.text(`Rs. ${order.sgst.toLocaleString()}`, 195, y, { align: "right" });
                y += 6;
            } else if (order.igst > 0) {
                doc.text(`IGST (5%):`, 140, y, { align: "right" });
                doc.text(`Rs. ${order.igst.toLocaleString()}`, 195, y, { align: "right" });
                y += 6;
            }
        }

        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Grand Total: Rs. ${(order.total_amount || grandTotal).toLocaleString()}`, 195, y, { align: "right" });

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
        "💮 *Welcome to Cast Prince!*\n\nDiscover our premium collection of silk & cotton sarees."
    );
    const welcomeImg = await getConfig('wa_welcome_image',
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85"
    );

    // Build shop URL
    // Automatically detect Vercel URL or fallback to env variable
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://aiswaryasaree.vercel.app');
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

    // ── Message 2: Quick actions with View Catalogue ──
    await sendButtons(to, "Explore our collections & manage orders:", [
        { id: "menu_catalogue", title: "📖 View Catalogue" },
        { id: "menu_track", title: "My Orders" },
        { id: "menu_contact", title: "Contact Us" }
    ]);
}




export async function sendCatalog(to) {
    const header = await getConfig('wa_catalog_header', "PREMIUM COLLECTIONS");
    const body = await getConfig('wa_catalog_body', "Curated just for you:");

    await sendList(to, header, body, "View Collections", [
        { id: "menu_catalogue", title: "📂 Browse Categories", description: "By Saree Type" },
        { id: "ctlg_all", title: "🌟 New Arrivals", description: "Latest Collections" },
        { id: "ctlg_all_full", title: "📖 Full Catalogue", description: "Browse Inventory" }
    ]);
}

// ─── CATALOGUE FLOW (Dynamic categories from DB) ────────────────────────────

const CATEGORY_EMOJIS = {
    'silk saree': '✨', 'cotton saree': '🌿', 'designer': '💎',
    'georgette': '🌸', 'banarasi': '🏛️', 'chiffon': '🦋',
    'linen': '🌾', 'pattu': '🪔', 'kanjivaram': '👑',
    'organza': '💫', 'tussar': '🍂', 'crepe': '🌙'
};

function getCategoryEmoji(category) {
    const lower = (category || '').toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return '🧵';
}

export async function sendCatalogueCategories(to) {
    // Dynamically fetch all distinct categories from the products table
    const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

    // Count products per category
    const catMap = {};
    (allProducts || []).forEach(p => {
        if (p.category) {
            catMap[p.category] = (catMap[p.category] || 0) + 1;
        }
    });

    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (categories.length === 0) {
        return sendText(to, "⚠️ Our catalogue is being updated. Please check back soon!");
    }

    // Build list rows — max 10 rows in a WhatsApp list
    const rows = [];

    // 1. Always add New Arrivals first
    rows.push({
        id: 'ctlg_all_new', // This will show all, starting with newest (due to sorting in sendCatalogueByType)
        title: '🆕 New Arrivals',
        description: 'Latest premium sarees added'
    });

    // 2. Add categories from DB
    categories.slice(0, 8).map(([cat, count]) => {
        rows.push({
            id: `ctlg_${cat.replace(/\s+/g, '_').toLowerCase()}`,
            title: `${getCategoryEmoji(cat)} ${cat}`,
            description: `${count} saree${count > 1 ? 's' : ''} available`
        });
    });

    // 3. View All at the end
    rows.push({
        id: 'ctlg_all_full',
        title: '🌟 View Full Collection',
        description: `Browse all ${allProducts.length} items`
    });

    await sendList(to, "📖 SAREE CATALOGUE", `Explore our premium saree collection.\n\nWe have ${allProducts.length} beautiful items ready for you! ✨\n\nSelect a category or browse all:`, "Browse Collection", rows);
}

export async function sendCatalogueByType(to, typeIdRaw, startOffset = 0) {
    // typeIdRaw is like 'ctlg_silk_saree' or 'ctlg_all' or 'ctlg_page_silk_saree_50'
    const cleanId = typeIdRaw.replace('ctlg_page_', '').replace('ctlg_', '');
    const typeId = cleanId.split('_').filter(s => !/^\d+$/.test(s)).join('_') || 'all';

    let categoryName = 'All Sarees';
    let searchFilter = null;

    if (typeId !== 'all') {
        // Convert back from snake_case to find matching category
        const searchTerm = typeId.replace(/_/g, ' ');
        categoryName = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
        searchFilter = searchTerm;
    }

    if (startOffset === 0) await sendText(to, `📖 Loading *${categoryName}* catalogue...`);

    let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (searchFilter) query = query.ilike('category', `%${searchFilter}%`);

    const streamId = startStream(to);
    const PAGE_LIMIT = 8; // Small batches to avoid timeout and bursting

    let { data: prods, count } = await query.order('created_at', { ascending: false }).range(startOffset, startOffset + PAGE_LIMIT - 1);

    if (!prods || prods.length === 0) {
        if (startOffset === 0) {
            return sendButtons(to, `⚠️ No sarees found in *${categoryName}* right now.`, [
                { id: "menu_catalogue", title: "📖 Back to Catalogue" },
                { id: "menu_main", title: "🏠 Main Menu" }
            ]);
        }
        return sendText(to, "⚠️ No more items in this category.");
    }

    console.log(`[WA] Sending catalogue chunk: ${prods.length} of ${count} (Start: ${startOffset})`);

    for (const p of prods) {
        if (!isStreamActive(to, streamId)) return;

        const stockStatus = p.stock < 1 ? "❌ OUT OF STOCK" : p.stock < 5 ? `⚠️ Only ${p.stock} left!` : "✅ In Stock";
        const groupTag = p.product_group ? `\n🏷️ ${p.product_group}` : '';
        const caption = `📖 *${p.name}*\n${p.description || ''}${groupTag}\n\n💎 *₹${p.price.toLocaleString()}*\n${stockStatus}`;

        // Variable Product Logic: Change button label
        const isVariable = p.type === 'variant';
        const buttons = p.stock > 0
            ? [{ id: `addcart_${p.id}`, title: isVariable ? "🎨 Select Option" : "🛒 Add to Bag" }]
            : [{ id: "menu_catalogue", title: "📖 Back to Catalogue" }];

        try {
            await sendImageButtons(to, getPremiumImage(p), caption, buttons);
        } catch (err) {
            await sendText(to, caption + "\n[Image failed, but you can Add to Bag]");
        }
        await new Promise(r => setTimeout(r, 450)); // Optimal delay to stay under Vercel limits
    }

    if (!isStreamActive(to, streamId)) return;

    const nextOffset = startOffset + prods.length;
    const hasMore = count > nextOffset;

    if (hasMore) {
        await sendButtons(to, `👇 Showing ${nextOffset} of ${count} sarees in *${categoryName}*.`, [
            { id: `ctlg_page_${typeId}_${nextOffset}`, title: "📜 Show More" },
            { id: "menu_catalogue", title: "📖 Back to Types" }
        ]);
    } else {
        await sendButtons(to, `✅ That's all ${count} saree${count > 1 ? 's' : ''} in *${categoryName}*!\n\nWhat would you like to do next?`, [
            { id: "menu_catalogue", title: "📖 More Types" },
            { id: "menu_cart", title: "👜 View Bag" },
            { id: "menu_shop_web", title: "🛍️ Visit Web Store" }
        ]);
    }
}

const PAGE_SIZE = 50;

// Consolidated with sendCatalogueByType for consistency
export async function sendProductsByCategory(to, categoryIdRaw, startOffset = 0) {
    return await sendCatalogueByType(to, categoryIdRaw, startOffset);
}

export async function handleAddToCart(to, productIdRaw) {
    const productId = productIdRaw.replace('addcart_', '');

    // Fetch product and its variants
    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
    const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', productId);

    if (!product || product.stock < 1) return sendText(to, "⚠️ Sorry, this item is out of stock.");

    if (variants && variants.length > 0) {
        // Show variant selection list
        const rows = variants.map(v => ({
            id: `vsel_${v.id}`,
            title: v.name,
            description: `₹${v.price.toLocaleString()} | Stock: ${v.stock}`
        }));

        return await sendList(to, "🎨 SELECT OPTION", `Please select your preferred option for *${product.name}*:`, "Select Option", rows);
    }

    // No variants, add directly
    await addToCart(to, product, 1);
    const { data: cartItem } = await supabase.from('whatsapp_cart').select('quantity').eq('phone', to).eq('product_id', productId).is('variant_id', null).single();
    const qty = cartItem ? cartItem.quantity : 1;

    await sendButtons(to, `✅ *Added to Bag*\n${product.name}\nQty in Bag: ${qty}`, [
        { id: `qty_inc_${productId}`, title: "➕ Add Another" },
        { id: `qty_dec_${productId}`, title: "➖ Reduce Qty" },
        { id: "menu_cart", title: "👜 View Bag" }
    ]);
}

export async function handleVariantSelection(to, variantId) {
    const { data: variant } = await supabase.from('product_variants').select('*, products(*)').eq('id', variantId).single();
    if (!variant || variant.stock < 1) return sendText(to, "⚠️ Sorry, this option is out of stock.");

    const product = variant.products;
    await addToCart(to, product, 1, variant);

    const { data: cartItem } = await supabase.from('whatsapp_cart').select('quantity').eq('phone', to).eq('variant_id', variantId).single();
    const qty = cartItem ? cartItem.quantity : 1;

    await sendButtons(to, `✅ *Added to Bag*\n${product.name} (${variant.name})\nQty in Bag: ${qty}`, [
        { id: `vqty_inc_${variantId}`, title: "➕ Add Another" },
        { id: `vqty_dec_${variantId}`, title: "➖ Reduce Qty" },
        { id: "menu_cart", title: "👜 View Bag" }
    ]);
}

export async function handleModifyQuantity(to, action, targetId, isVariant = false) {
    const query = supabase.from('whatsapp_cart').select('*').eq('phone', to);
    if (isVariant) query.eq('variant_id', targetId);
    else query.eq('product_id', targetId).is('variant_id', null);

    const { data: item } = await query.single();
    if (!item) return sendText(to, "Item not found in bag.");

    let newQty = item.quantity;
    if (action === 'inc') newQty += 1;
    if (action === 'dec') newQty -= 1;

    const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;

    if (newQty < 1) {
        await supabase.from('whatsapp_cart').delete().eq('id', item.id);
        return sendText(to, `🗑️ Removed ${itemName} from bag.`);
    } else {
        await supabase.from('whatsapp_cart').update({ quantity: newQty }).eq('id', item.id);

        const incId = isVariant ? `vqty_inc_${targetId}` : `qty_inc_${targetId}`;
        const decId = isVariant ? `vqty_dec_${targetId}` : `qty_dec_${targetId}`;

        await sendButtons(to, `✅ *Quantity Updated*\n${itemName}\nNew Qty: ${newQty}`, [
            { id: incId, title: "➕ Add Another" },
            { id: decId, title: "➖ Reduce Qty" },
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
        const name = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
        msg += `${i + 1}. ${name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString()}\n`;
    });
    msg += `\n💎 *Total: ₹${total.toLocaleString()}*`;

    await sendButtons(to, msg, [
        { id: "start_checkout", title: "✅ Checkout" },
        { id: "menu_browse", title: "🛍️ Add More" },
        { id: "edit_cart", title: "✏️ Edit Bag" }
    ]);
}

export async function handleEditCart(to) {
    const cart = await getCart(to);
    if (!cart || cart.length === 0) return handleViewCart(to);

    const sections = [{
        title: "Select Item to Edit",
        rows: cart.map(item => ({
            id: `edit_item_${item.id}`, // item.id is the row ID in whatsapp_cart
            title: (item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name).substring(0, 23),
            description: `Qty: ${item.quantity} | ₹${item.price * item.quantity}`
        }))
    }];

    await sendList(to, "✏️ EDIT BAG", "Select an item to change quantity or remove:", "Select Item", sections);
}

export async function handleCartItemOptions(to, cartItemId) {
    const { data: item } = await supabase.from('whatsapp_cart').select('*').eq('id', cartItemId).single();
    if (!item) return handleViewCart(to);

    const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
    const isVariant = !!item.variant_id;
    const targetId = isVariant ? item.variant_id : item.product_id;
    const incId = isVariant ? `vqty_inc_${targetId}` : `qty_inc_${targetId}`;
    const decId = isVariant ? `vqty_dec_${targetId}` : `qty_dec_${targetId}`;

    await sendButtons(to, `⚙️ *Edit Item*\n${itemName}\nQty: ${item.quantity}`, [
        { id: incId, title: "➕ Increase" },
        { id: decId, title: "➖ Reduce" },
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
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    // Initial Draft
    await supabase.from('orders').insert({
        id: orderId,
        customer_phone: to,
        status: "DRAFT",
        subtotal: subtotal,
        total_amount: subtotal, // Placeholder
        created_at: new Date()
    });

    // Add Items (Support Variants)
    const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_at_time: item.price,
        variant_id: item.variant_id,
        variant_name: item.variant_name
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

export async function askState(to, orderId) {
    const rows = INDIAN_STATES.map(s => ({
        id: `state_${s.replace(/\s+/g, '_').toLowerCase()}_${orderId}`,
        title: s
    }));

    await sendList(to, "📍 SELECT STATE", "Please select your delivery state to calculate taxes & shipping correctly:", "Select State", rows);
}

export async function handleStateSelection(to, stateNameClean, orderId) {
    // stateNameClean is like 'tamil_nadu'
    const stateName = stateNameClean.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) return;

    const subtotal = order.subtotal || 0;
    const tax = subtotal * GST_RATE;
    const shipping = FLAT_SHIPPING;
    const total = subtotal + tax + shipping;

    // Calculate CGST/SGST vs IGST
    let taxDetails = {};
    if (stateName === HOME_STATE) {
        taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
    } else {
        taxDetails = { cgst: 0, sgst: 0, igst: tax };
    }

    await supabase.from('orders').update({
        customer_state: stateName,
        tax_amount: tax,
        shipping_cost: shipping,
        total_amount: total,
        ...taxDetails
    }).eq('id', orderId);

    return await askPaymentMode(to, orderId);
}

export async function askPaymentMode(to, orderId) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const total = order?.total_amount?.toLocaleString() || '0';

    await sendButtons(to, `✅ *Address & Taxes Confirmed!*\n\n💰 *Total Billing: ₹${total}*\n(Inc. GST & Shipping)\n\nHow would you like to pay?`, [
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
        const payeeName = 'Cast Prince+Sarees';
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
        await sendButtons(to, "💗 Thank you for shopping with *Cast Prince*!\n\nTap below to manage your orders.", [
            { id: "menu_track", title: "Track Order" },
            { id: "menu_my_orders", title: "My Orders" }
        ]);
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

    await sendButtons(to, "💗 Thank you for shopping with *Cast Prince*!\n\nTap below to manage your orders.", [
        { id: "menu_track", title: "Track Order" },
        { id: "menu_my_orders", title: "My Orders" }
    ]);
}
export async function handleTrackOrder(to) {
    const { data: orders } = await supabase.from('orders').select('*').eq('customer_phone', to).neq('status', 'DRAFT').order('created_at', { ascending: false }).limit(1);
    if (!orders?.length) return sendButtons(to, "No previous orders found.", [{ id: "menu_main", title: "🏠 Main Menu" }]);

    const o = orders[0];
    await sendButtons(to, `📦 *Last Order Details*\n\nID: #${o.id}\nStatus: ${o.status}\nAmount: ₹${o.total_amount}\nDate: ${new Date(o.created_at).toLocaleDateString()}`, [
        { id: "menu_main", title: "🏠 Main Menu" }
    ]);
}

export async function handleContact(to) {
    const contactMsg = await getConfig('wa_contact_message', "📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\nsupport@castprince.com");
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
        const value = body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];
        if (!message) return;
        const from = message.from;
        const msgType = message.type;

        // --- 0. CUSTOMER SYNC ---
        const { data: customer } = await supabase.from('customers').select('*').eq('phone', from).single();
        if (!customer) {
            const profileName = value?.contacts?.[0]?.profile?.name || 'WhatsApp Customer';
            await supabase.from('customers').insert({ phone: from, name: profileName, role: 'user' });
            console.log(`[WA] New customer created: ${from} (${profileName})`);
        }
        // -------------------------
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
            if (['catalogue', 'catalog', 'browse'].includes(text)) return await sendCatalogueCategories(from);
            if (text === 'contact') return await handleContact(from);
            if (['stop', 'cancel'].includes(text)) return await sendText(from, "✅ Stopped. Send *Hi* to start again.");

            // Handle Website Checkout Redirection
            if (text.includes('i just placed an order #') || text.startsWith('finish order #') || text.includes('please confirm is this your order in the website')) {
                const match = text.match(/order #([a-z0-9-]+)/i);
                if (match) {
                    const orderId = match[1].toUpperCase();

                    const { data: order } = await supabase.from('orders').select('id, status, payment_method, total_amount, delivery_address, customer_name').eq('id', orderId).single();

                    if (order) {
                        // If it's still a draft from old flow
                        if (order.status === 'DRAFT') {
                            await supabase.from('orders').update({ customer_phone: from }).eq('id', orderId);
                            await sendText(from,
                                `📝 *Complete Your Order* (#${orderId})\n\n` +
                                `Please reply with your delivery details in this format:\n\n` +
                                `*Name, Mobile Number, Full Address*\n\n` +
                                `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
                            );
                            return;
                        }

                        // Order placed completely on website
                        await sendText(from, `✅ *Order Confirmed! (#${orderId})*\n\nThank you, ${order.customer_name || 'Customer'}!\n\n📍 *Delivery Address:*\n${order.delivery_address}\n\n🛒 *Total Billing:* ₹${order.total_amount.toLocaleString()}`);

                        if (order.payment_method === 'UPI' && order.status === 'AWAITING_PAYMENT') {
                            const rawAmount = order.total_amount || 0;
                            const upiId = 'samypranesh@okicici';
                            const payeeName = 'Cast Prince+Sarees';
                            const upiLink = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${rawAmount}&cu=INR&tn=Order+${orderId}`;

                            await sendText(from,
                                `📲 *UPI Payment — ₹${rawAmount.toLocaleString()}*\n\n` +
                                `Tap the link below to pay via GPay, PhonePe or any UPI app:\n\n` +
                                `👉 ${upiLink}\n\n` +
                                `UPI ID: *${upiId}*`
                            );

                            await sendButtons(from, `⏳ After completing the payment, tap below to confirm:`, [
                                { id: `paid_confirm_${orderId}`, title: "✅ I Have Paid" }
                            ]);
                        } else if (order.payment_method === 'COD') {
                            await sendText(from, "📄 Generating your invoice...");
                            const { data: fullOrder } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();
                            const invoiceUrl = await generateAndUploadInvoice(fullOrder);
                            if (invoiceUrl) {
                                await sendDocument(from, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
                            }
                            await sendText(from, "💗 We will contact you shortly to confirm cash on delivery dispatch!");
                        }
                        return;
                    }
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

                return await askState(from, draft.id);
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
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://aiswaryasaree.vercel.app');
                const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(from)}`;
                return await sendText(from,
                    `🛍️ *Open our Online Store:*\n\n👆 Tap the link below to browse & order sarees:\n\n${shopUrl}\n\n✨ You can browse our full collection, add to cart and place your order directly from the website!\n\nAfter placing your order, you'll be redirected back here with your order confirmation. 💮`
                );
            }
            if (id === 'menu_browse') return await sendCatalog(from);
            if (id === 'menu_catalogue') return await sendCatalogueCategories(from);
            if (id === 'menu_cart') return await handleViewCart(from);
            if (id === 'menu_track' || id === 'menu_my_orders') return await handleTrackOrder(from);
            if (id === 'menu_contact') return await handleContact(from);

            // ── Catalogue flow: ctlg_ and ctlg_page_ ──
            if (id.startsWith('ctlg_page_')) {
                // Paginated catalogue: ctlg_page_silk_saree_50
                const parts = id.replace('ctlg_page_', '').split('_');
                const offset = parseInt(parts.pop());
                const typeId = parts.join('_');
                return await sendCatalogueByType(from, typeId, offset);
            }
            if (id === 'ctlg_all_new' || id === 'ctlg_all_full') return await sendCatalogueByType(from, 'all');
            if (id.startsWith('ctlg_')) return await sendCatalogueByType(from, id);

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
                return await askState(from, orderId);
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

            if (id.startsWith('vqty_inc_')) return await handleModifyQuantity(from, 'inc', id.replace('vqty_inc_', ''), true);
            if (id.startsWith('vqty_dec_')) return await handleModifyQuantity(from, 'dec', id.replace('vqty_dec_', ''), true);
            if (id.startsWith('vsel_')) return await handleVariantSelection(from, id.replace('vsel_', ''));

            if (id.startsWith('edit_item_')) return await handleCartItemOptions(from, id.replace('edit_item_', ''));

            if (id.startsWith('state_')) {
                const parts = id.split('_');
                const orderId = parts.pop();
                const stateClean = parts.slice(1).join('_');
                return await handleStateSelection(from, stateClean, orderId);
            }

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

