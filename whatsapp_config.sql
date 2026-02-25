-- ════════════════════════════════════════════════════════════════
-- WHATSAPP CONFIGURABLE SETTINGS
-- ════════════════════════════════════════════════════════════════

-- Create generic settings table for app-wide configurations
create table if not exists app_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default now()
);

-- Insert default WhatsApp Configurations
insert into app_settings (key, value, description) values
('wa_welcome_message', '🌸 *Welcome to Aiswarya Sarees Premium* 🌸\n\nHow may we assist you today?', 'Main greeting message sent on Hi/Menu'),
('wa_welcome_image', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85', 'Image URL for the welcome message'),
('wa_contact_message', '📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\nsupport@aiswaryatextiles.com', 'Contact support message'),
('wa_checkout_msg', '📝 *Checkout Confirmation*\n\nPlease reply with your *Full Name and Address* in a single message to confirm delivery.\n\nExample:\nLakshmi, 12 Main St, Bangalore 560001', 'Instructions for new address input'),
('wa_catalog_header', 'PREMIUM COLLECTIONS', 'Header for the main catalog list'),
('wa_catalog_body', 'Curated just for you:', 'Body text for the main catalog list')
on conflict (key) do nothing;
