CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Default settings
INSERT INTO app_settings (key, value) VALUES 
('near_expiry_threshold', '90'),
('allow_salesman_near_expiry', 'true')
ON CONFLICT (key) DO NOTHING;

-- Extend parties table for MARG Import
ALTER TABLE parties ADD COLUMN IF NOT EXISTS delivery_route VARCHAR(150);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_3 TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS landline VARCHAR(50);
