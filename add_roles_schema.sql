-- ════════════════════════════════════════════════════════════════
-- ROLE-BASED AUTHENTICATION SCHEMA
-- ════════════════════════════════════════════════════════════════

-- 1. Create enum for user roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. Update Customers table to include role
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 3. Update existing customers to have 'user' role if they don't have one
UPDATE customers SET role = 'user' WHERE role IS NULL;

-- 4. Function to promote a customer to admin (by phone number)
-- Usage: SELECT promote_to_admin('91XXXXXXXXXX');
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- 5. Seed initial admin if you have a phone number (Optional)
-- UPDATE customers SET role = 'admin' WHERE phone = '917558189732';
