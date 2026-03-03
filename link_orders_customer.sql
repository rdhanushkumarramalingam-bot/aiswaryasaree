-- Link Orders to Customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Optional: Add source column for website orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WEBSITE';
