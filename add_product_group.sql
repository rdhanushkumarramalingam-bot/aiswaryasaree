-- ════════════════════════════════════════════════════════════════
-- ADD PRODUCT GROUP COLUMN FOR PRODUCT TAGGING / GROUPING
-- ════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times.

-- Add product_group column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_group text;

-- Create index for fast group lookups
CREATE INDEX IF NOT EXISTS idx_products_group ON products(product_group);

-- Create index for fast category lookups  
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ════════════════════════════════════════════════════════════════
-- DONE!
-- ════════════════════════════════════════════════════════════════
