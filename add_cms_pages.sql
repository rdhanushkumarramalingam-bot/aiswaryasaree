-- Create CMS Pages Table
CREATE TABLE IF NOT EXISTS public.cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for slug
CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON public.cms_pages (slug);

-- Enable Row Level Security (optional, usually admin only in this context)
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Simple policy for everyone to read published pages
CREATE POLICY "Public read published pages" ON public.cms_pages
    FOR SELECT USING (is_published = TRUE);

-- Admin policy for all operations
-- Based on the project's logic, usually anon key is used with RLS turned off or very permissive policies.
-- Let's create a policy that allows everything for simplicity if it's an internal tool.
CREATE POLICY "Full access to cms_pages" ON public.cms_pages
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cms_pages_updated_at
    BEFORE UPDATE ON public.cms_pages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
