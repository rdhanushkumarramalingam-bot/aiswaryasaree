-- Add cart_data column to customers table for persistent cart across sessions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cart_data JSONB DEFAULT '[]';
