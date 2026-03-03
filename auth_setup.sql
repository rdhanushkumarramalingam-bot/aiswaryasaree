-- ════════════════════════════════════════════════════════════════
-- MASTER AUTH & ROLE MIGRATION
-- ════════════════════════════════════════════════════════════════

-- 1. Create enum for user roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. Create Customers Table if not exists
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Ensure role column exists and is of correct type
-- (In case table already existed with text role)
ALTER TABLE customers ALTER COLUMN role SET DEFAULT 'user';

-- 4. Create OTP Verification Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Helper function to promote to admin
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- 6. SEED INITIAL ADMIN (Example)
-- SELECT promote_to_admin('917558189732');
