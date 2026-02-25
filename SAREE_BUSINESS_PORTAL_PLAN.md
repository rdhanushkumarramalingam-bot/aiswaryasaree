# Saree Business Portal Implementation Plan

## 1. Project Overview
A centralized portal for managing a saree business, integrating catalog management, order tracking, and a WhatsApp-first customer experience. The system automates the flow from product discovery on WhatsApp to ordering, payment verification, and invoice delivery.

### Key Objectives
- **Catalog Management**: Easy-to-use admin interface to upload saree loads.
- **WhatsApp Automation**:
  - "Hi" triggers product catalog.
  - Cart management within WhatsApp.
  - Order ID generation & Payment links.
  - Automated Invoice delivery after payment confirmation.
- **Minimal Dependencies**: Use core Next.js features and lightweight libraries to ensure speed and maintainability.

---

## 2. Technical Architecture

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL) - Scalable, real-time, handling Auth & Storage.
- **Styling**: Tailwind CSS (via internal modules or global CSS).
- **External Services**:
  - **WhatsApp**: Meta Cloud API (Direct HTTP calls, no heavy SDKs).
  - **Payment**: UPI Deep Links (PhonePe/GPay) + Razorpay/Stripe (Optional for automation).
- **PDF Generation**: `jspdf` or `pdf-lib` for invoices.

### Core Modules
1.  **Admin Portal** (`/admin`):
    - Dashboard (Sales stats).
    - Product Manager (CRUD for Sarees).
    - Order Manager (Track status, mark payments).
2.  **Public Portal**:
    - Track Order Page (`/track-order`).
3.  **API Layer**:
    - `/api/whatsapp/webhook`: Handles incoming messages.
    - `/api/orders`: Order creation and status updates.

---

## 3. Database Schema (Supabase)

### Tables

#### 1. `products`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | Text | Saree Name/Code |
| `price` | Decimal | Price in INR |
| `image_url` | Text | Link to Supabase Storage |
| `stock` | Integer | Inventory count |
| `category` | Text | E.g., Silk, Cotton |
| `is_active` | Boolean | True if available for WhatsApp |

#### 2. `orders`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Text | Unique Order ID (e.g., ORD-2024-001) |
| `customer_phone` | Text | WhatsApp Number |
| `customer_name` | Text | Name from WhatsApp profile |
| `total_amount` | Decimal | Final calculation |
| `status` | Text | PENDING, PAID, INVOICED, SHIPPED |
| `payment_method` | Text | UPI, RAZORPAY, CASH |
| `transaction_id` | Text | PhonePe/GPay Ref ID |
| `invoice_url` | Text | PDF Link |
| `created_at` | Timestamp| |

#### 3. `order_items`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `order_id` | Text | FK to orders |
| `product_id` | UUID | FK to products |
| `quantity` | Integer | |
| `price_at_time`| Decimal | |

---

## 4. WhatsApp Integration Flow

We will use the **Meta WhatsApp Cloud API** directly to keep packages minimal.

### Flow Diagram
1.  **Customer**: Sends "Hi".
2.  **Webhook**: Next.js API receives event.
3.  **Bot**: Fetches active `products` and sends an **Interactive List Message**.
4.  **Customer**: Selects "Add to Cart" on items.
5.  **Bot**: Maintains session (DB or Cache), confirms addition.
6.  **Customer**: Sends "Checkout".
7.  **Bot**:
    - Calculates Total.
    - Generates **Order ID**.
    - Sends **Payment Link** (UPI Intent Link or Gateway Link).
    - "Please pay ₹2500 via PhonePe/GPay and share the screenshot/Transaction ID."

### Payment & Invoicing Logic
1.  **Payment Verification**:
    - *Automated*: If using a gateway (Razorpay), a webhook updates `orders.status` to `PAID`.
    - *Manual*: User uploads screenshot -> Admin checks portal -> Clicks "Verify Payment".
2.  **Invoice Generation**:
    - **Trigger**: Order status changes to `PAID`.
    - **Action**:
        - System generates PDF Invoice (Logo, Order Details, GST).
        - Uploads to Supabase Storage.
    - **Delivery**:
        - Bot sends the PDF Document to the customer on WhatsApp: "Payment Received! Here is your invoice."

---

## 5. Implementation Roadmap

### Phase 1: Foundation
- set up Next.js project.
- Configure Supabase Client.
- Create Database Tables.

### Phase 2: Admin Dashboard (The "Portal")
- Build `/admin/products`: Form to add Saree details + Image Upload.
- Build `/admin/orders`: List view of incoming orders with status toggles.

### Phase 3: WhatsApp Webhook Setup
- Verify Meta Developer Account.
- Create `/api/webhook` route to verify token.
- Implement "Hi" -> List Products logic.

### Phase 4: Order & Payment Logic
- Implement Cart logic (using a temporary `carts` table in DB keyed by phone number).
- Implement "Checkout" flow.
- Admin button: "Mark Paid & Send Invoice".

### Phase 5: PDF Invoice Generation
- Create utility `generateInvoicePDF(order)`.
- Integrate with WhatsApp API media message sending.

---

## 6. Code Structure Recommendation

```
src/
├── app/
│   ├── admin/             # Admin Portal
│   │   ├── products/
│   │   ├── orders/
│   ├── api/
│   │   ├── webhook/       # WhatsApp Listener
│   │   ├── invoice/       # PDF Generation
│   ├── track-order/       # Public Tracking
├── lib/
│   ├── supabase.js        # DB Client
│   ├── whatsapp.js        # Helper for sending WA messages
│   ├── invoice-generator.js # PDF logic
├── components/            # Reusable UI
```
