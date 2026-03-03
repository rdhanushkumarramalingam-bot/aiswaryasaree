-- ════════════════════════════════════════════════════════════════
-- UPDATES FOR ZONE-BASED SHIPPING (UUID COMPATIBLE)
-- ════════════════════════════════════════════════════════════════
-- This script uses UUIDs to remain compatible with the project standard.

-- 1. Enable extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they were created with wrong types
DROP TABLE IF EXISTS shipping_zone_states;
DROP TABLE IF EXISTS shipping_zones;

-- 3. Create table for Shipping Zones
CREATE TABLE shipping_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create table for mapping states to zones
CREATE TABLE shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 5. Update Orders table (Drop column if it was INT, then add as UUID)
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_zone_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone_id UUID REFERENCES shipping_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;

-- 6. Seed initial zones (using variable names to handle UUIDs)
DO $$ 
DECLARE
  local_id UUID;
  south_id UUID;
  north_id UUID;
  intl_id UUID;
BEGIN
  -- Insert and get IDs
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Local (Tamil Nadu)', 50, 2000) RETURNING id INTO local_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('South India', 80, 3000) RETURNING id INTO south_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Rest of India', 120, 5000) RETURNING id INTO north_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold, is_international) 
  VALUES ('International', 1500, 0, TRUE) RETURNING id INTO intl_id;

  -- Map states
  INSERT INTO shipping_zone_states (zone_id, state_name) VALUES (local_id, 'Tamil Nadu');
  
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT south_id, s FROM unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s;

  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT north_id, s FROM unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s;
END $$;
