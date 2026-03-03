-- Migration to support Product Variants
-- 1. Add type to products (simple or variant)
ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'simple';

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Color: Red"
  price NUMERIC,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update whatsapp_cart to support variants
ALTER TABLE whatsapp_cart ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE whatsapp_cart ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- 4. Update order_items to support variants
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;
