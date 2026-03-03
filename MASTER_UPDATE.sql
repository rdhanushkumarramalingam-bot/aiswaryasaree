-- ════════════════════════════════════════════════════════════════
-- MASTER DATABASE UPDATE: TAXES, SHIPPING ZONES, AND ROLES
-- ════════════════════════════════════════════════════════════════
-- Run this script in your Supabase SQL Editor once.

-- 1. Enable UUID Extension (required for many tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & CORE TABLES
------------------------------------------------------------------
-- A. User Role Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- B. User Roles mapping/tracking (OTP)
CREATE TABLE IF NOT EXISTS otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- C. Customers (Unified store for both regular & admin users)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  role user_role DEFAULT 'user', -- Role for RBAC
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure existing customers have a role if they don't
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
UPDATE customers SET role = 'user' WHERE role IS NULL;

-- 3. SHIPPING ZONES SYSTEM (Clean Reset for these specific tables)
------------------------------------------------------------------
-- We drop these and recreate to ensure columns like 'rate' exist and match the seed
DROP TABLE IF EXISTS shipping_zone_states CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;

-- Create Zones Table (UUID based)
CREATE TABLE shipping_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Map States to Zones
CREATE TABLE shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 4. ORDER SYSTEM ENHANCEMENTS (Additive only)
------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone_id UUID REFERENCES shipping_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 5. SEED DATA (CORE FUNCTIONALITY)
------------------------------------------------------------------
-- Insert Shipping Zones and States (Local -> TN, South, Rest of India, Intl)
DO $$ 
DECLARE
  local_id UUID;
  south_id UUID;
  north_id UUID;
  intl_id UUID;
BEGIN
  -- Insert zones and capture IDs
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Local (Tamil Nadu)', 50, 2000) RETURNING id INTO local_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('South India', 80, 3000) RETURNING id INTO south_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Rest of India', 120, 5000) RETURNING id INTO north_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold, is_international) 
  VALUES ('International', 1500, 0, TRUE) RETURNING id INTO intl_id;

  -- Map States (Tamil Nadu -> Local)
  INSERT INTO shipping_zone_states (zone_id, state_name) VALUES (local_id, 'Tamil Nadu');
  
  -- South India
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT south_id, s FROM unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s;

  -- Rest of India
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT north_id, s FROM unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s;
END $$;

-- 6. HELPER FUNCTIONS
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- MASTER SCHEMA REPAIRED & UPDATED!
-- ════════════════════════════════════════════════════════════════
