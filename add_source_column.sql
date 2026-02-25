-- ════════════════════════════════════════════════════════════════
-- AISWARYA SAREES — ADD WEBSITE/WHATSAPP SOURCE TRACKING
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Add 'source' column to orders table to track if order came from 
--    WhatsApp Bot ('WHATSAPP') or the Shopping Website ('WEBSITE')
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'WHATSAPP';

-- 2. Add 'discount' column to products if not exists (used by shop page)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- 3. Update existing WEB- orders to have source = 'WEBSITE'
UPDATE orders
SET source = 'WEBSITE'
WHERE id LIKE 'WEB-%';

-- 4. Ensure WhatsApp cart has image_url column
ALTER TABLE whatsapp_cart
ADD COLUMN IF NOT EXISTS image_url text;

-- Done! Now orders will show their source channel in the admin portal.
SELECT 'Migration complete!' as status;
