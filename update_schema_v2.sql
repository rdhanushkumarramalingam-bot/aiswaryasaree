-- ════════════════════════════════════════════════════════════════
-- UPDATES FOR WHATSAPP OTP LOGIN AND TAXATION SYSTEM
-- ════════════════════════════════════════════════════════════════

-- 1. Create OTPS table for WhatsApp Login
CREATE TABLE IF NOT EXISTS otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone number to speed up lookups
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- 2. Update Orders table for Taxation and Shipping Tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 3. Create Customers table (Optional but good for persistent accounts)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
