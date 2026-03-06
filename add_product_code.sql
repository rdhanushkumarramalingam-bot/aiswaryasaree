-- Run this in the Supabase SQL Editor to add the product_code column
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code text UNIQUE;
