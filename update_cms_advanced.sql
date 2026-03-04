-- Update CMS Pages Table with Advanced Features
ALTER TABLE public.cms_pages 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.cms_pages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft', -- draft, published, scheduled
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public', -- public, private, password
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS custom_js TEXT,
ADD COLUMN IF NOT EXISTS publish_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add RLS policy for parent_id if needed
-- Existing policies should cover the new columns since they are on the same table.
