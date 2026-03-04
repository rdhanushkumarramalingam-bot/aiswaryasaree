-- Add Alert Threshold to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 0;

-- Optional: Add a column to track total added vs total sold for analysis
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_added INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;

-- Ensure total_added is initialized with current stock for existing products
UPDATE products SET total_added = stock WHERE total_added = 0;
