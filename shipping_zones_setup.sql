-- ════════════════════════════════════════════════════════════════
-- SHIPPING ZONES & RATES SCHEMA
-- ════════════════════════════════════════════════════════════════

-- 1. Create table for Shipping Zones
CREATE TABLE IF NOT EXISTS shipping_zones (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for mapping states to zones
CREATE TABLE IF NOT EXISTS shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id INT REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 3. Seed some default zones
INSERT INTO shipping_zones (name, rate, free_threshold) VALUES 
('Local (Tamil Nadu)', 50, 2000),
('South India', 80, 3000),
('Rest of India', 120, 5000),
('International', 1500, 0)
ON CONFLICT (name) DO NOTHING;

-- Map states to zones (approximate)
-- Tamil Nadu -> Local
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, 'Tamil Nadu' FROM shipping_zones WHERE name = 'Local (Tamil Nadu)'
ON CONFLICT (state_name) DO NOTHING;

-- South India (exclude TN)
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, s FROM shipping_zones, unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s 
WHERE name = 'South India'
ON CONFLICT (state_name) DO NOTHING;

-- Rest of India
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, s FROM shipping_zones, unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s 
WHERE name = 'Rest of India'
ON CONFLICT (state_name) DO NOTHING;
