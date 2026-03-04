-- ════════════════════════════════════════════════════════════════
-- SHOP SETTINGS SCHEMA & DEFAULTS
-- ════════════════════════════════════════════════════════════════

insert into app_settings (key, value, description) values
('shop_name', 'Aiswarya Sarees', 'The official name of the shop used in invoices and messages'),
('shop_logo', 'https://via.placeholder.com/200?text=Aiswarya+Sarees', 'Logo URL for the shop'),
('shop_address', '123 Silk Road, Weaver City, Tamil Nadu 600001', 'Physical address shown on invoices'),
('shop_gstin', '33AABCA1234A1Z1', 'GST Number for the business'),
('bill_terms', '1. Goods once sold cannot be taken back.\n2. All disputes are subject to local jurisdiction.', 'Terms and conditions shown at the bottom of the bill'),
('bill_footer', 'Thank you for shopping with Aiswarya Sarees!', 'Greeting text at the end of the invoice')
on conflict (key) do nothing;
