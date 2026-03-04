import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

export async function generateInvoicePDF(order) {
    const doc = new jsPDF();

    // Fetch branding from settings
    let branding = {
        shop_name: "Cast Prince",
        shop_address: "Premium Handwoven Textiles",
        shop_gstin: "",
        bill_footer: "Thank you for your business!"
    };

    try {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(item => {
                if (branding.hasOwnProperty(item.key)) {
                    branding[item.key] = item.value;
                }
            });
        }
    } catch (e) {
        console.error("PDF Branding Error:", e);
    }

    // Header
    doc.setFontSize(22);
    doc.text(branding.shop_name, 105, 20, { align: "center" });

    doc.setFontSize(10);
    const addressLinesHeader = doc.splitTextToSize(branding.shop_address, 150);
    doc.text(addressLinesHeader, 105, 28, { align: "center" });

    if (branding.shop_gstin) {
        doc.text(`GSTIN: ${branding.shop_gstin}`, 105, 36, { align: "center" });
    }

    doc.setDrawColor(0);
    doc.line(10, 40, 200, 40);

    // Customer Details
    doc.setFontSize(12);
    doc.text("INVOICE", 150, 50);
    doc.setFontSize(10);
    doc.text(`Invoice No: #INV-${order.id.toString().substring(0, 6)}`, 150, 56);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 62);

    doc.text("Bill To:", 10, 50);
    doc.setFont("helvetica", "bold");
    doc.text(order.customer_name || "Valued Customer", 10, 56);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_phone, 10, 62);
    const addressLines = doc.splitTextToSize(order.delivery_address || "Address not provided", 80);
    doc.text(addressLines, 10, 68);

    // Table Header
    let y = 90;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y, 190, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item Description", 15, y + 7);
    doc.text("Qty", 130, y + 7, { align: "right" });
    doc.text("Price", 160, y + 7, { align: "right" });
    doc.text("Amount", 190, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 15;

    // Items
    let total = 0;
    if (order.order_items) {
        order.order_items.forEach(item => {
            const amount = item.price_at_time * item.quantity;
            total += amount;

            doc.text(item.product_name, 15, y);
            doc.text(item.quantity.toString(), 130, y, { align: "right" });
            doc.text(item.price_at_time.toFixed(2), 160, y, { align: "right" });
            doc.text(amount.toFixed(2), 190, y, { align: "right" });

            y += 10;
        });
    }

    // Total
    doc.line(10, y, 200, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", 160, y, { align: "right" });
    doc.text(`INR ${total.toFixed(2)}`, 190, y, { align: "right" });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const footerText = branding.bill_footer || "Thank you for your business!";
    doc.text(footerText, 105, 280, { align: "center" });
    doc.text("Authorized Signatory", 190, 275, { align: "right" });

    // Return base64 for sending via API
    return doc.output('arraybuffer'); // Or blob, depending on upload need
}
