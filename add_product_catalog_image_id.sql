-- Add product_catalog_image_id column to products table
ALTER TABLE products ADD COLUMN product_catalog_image_id TEXT;

-- Create index for faster queries
CREATE INDEX idx_products_catalog_image_id ON products(product_catalog_image_id);
