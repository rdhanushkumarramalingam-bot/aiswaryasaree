-- ════════════════════════════════════════════════════════════════
-- SCHEDULED POSTS TABLE
-- ════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  product_price numeric,
  caption text NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  platform text DEFAULT 'facebook',
  status text DEFAULT 'PENDING',  -- PENDING, POSTED, FAILED, CANCELLED
  fb_post_id text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
