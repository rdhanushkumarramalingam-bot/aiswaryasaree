-- ════════════════════════════════════════════════════════════════
-- AISWARYA SAREES — COMPLETE DATABASE SCHEMA & SETUP
-- ════════════════════════════════════════════════════════════════
-- Run this entire script in the Supabase SQL Editor.
-- It is safe to run multiple times (it uses IF NOT EXISTS).

-- 1. ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CREATE TABLES

-- Products Table
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  stock integer default 0,
  category text, 
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Orders Table
create table if not exists orders (
  id text primary key,
  customer_name text,
  customer_phone text not null,
  total_amount numeric,
  status text default 'PENDING',
  payment_method text,
  delivery_address text,
  invoice_url text, -- For PDF invoice
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Order Items Table
create table if not exists order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id text references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer default 1,
  price_at_time numeric,
  product_name text
);

-- WhatsApp Cart Table
create table if not exists whatsapp_cart (
  id uuid default uuid_generate_v4() primary key,
  phone text not null,
  product_id uuid references products(id),
  product_name text not null,
  price numeric not null,
  quantity integer default 1,
  image_url text,
  created_at timestamp with time zone default now()
);

-- Index for cart performance
create index if not exists idx_whatsapp_cart_phone on whatsapp_cart(phone);

-- 3. STORAGE SETUP (For PDF Invoices)

-- Create 'invoices' bucket if not exists
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Allow public access to read invoices
create policy "Public Access Invoices"
  on storage.objects for select
  using ( bucket_id = 'invoices' );

-- Allow anonymous uploads (for the bot)
create policy "Anon Upload Invoices"
  on storage.objects for insert
  with check ( bucket_id = 'invoices' );


-- 4. FIX & DIVERSIFY PRODUCT IMAGES
-- Updates products with high-quality random images based on ID to avoid repetition.

-- Silk Sarees (Red, Green, Blue, Gold)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%3' OR id::text LIKE '%4' OR id::text LIKE '%5');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1583391726247-0372380d3f74?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%6' OR id::text LIKE '%7' OR id::text LIKE '%8');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%9' OR id::text LIKE '%a' OR id::text LIKE '%b');

-- Cotton Sarees (Simple, Elegant)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1609357602129-28f1cc48c48d?w=600&q=80' 
WHERE category ILIKE '%Cotton%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2' OR id::text LIKE '%3' OR id::text LIKE '%4');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1630303683072-4c6e93d7c43c?w=600&q=80' 
WHERE category ILIKE '%Cotton%' AND (id::text LIKE '%5' OR id::text LIKE '%6' OR id::text LIKE '%7' OR id::text LIKE '%8' OR id::text LIKE '%9');

-- Designer/Other (Modern, Flashy)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1596704017254-9b1b1b9e8d7a?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2' OR id::text LIKE '%3');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550614000-4b9519e07d72?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%4' OR id::text LIKE '%5' OR id::text LIKE '%6' OR id::text LIKE '%7');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1566236976-58bf9512316e?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%8' OR id::text LIKE '%9' OR id::text LIKE '%a' OR id::text LIKE '%b');

-- Fallback for any remaining empty images
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612458448839-81cb704400c4?w=600&q=80' 
WHERE image_url IS NULL OR image_url = '';

-- ════════════════════════════════════════════════════════════════
-- DONE!
-- ════════════════════════════════════════════════════════════════
