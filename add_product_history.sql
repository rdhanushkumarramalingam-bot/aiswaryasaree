-- ════════════════════════════════════════════════════════════════
-- PRODUCT STOCK HISTORY TRACKING
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  change_type text NOT NULL, -- 'ADD', 'SALE', 'ADJUSTMENT', 'DELETE'
  quantity_change integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
