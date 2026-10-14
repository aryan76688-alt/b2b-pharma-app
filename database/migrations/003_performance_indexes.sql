-- SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
-- Migration 003: Ultra High-Speed Performance Indexes
-- PostgreSQL 15+ / Supabase / Railway Compatible

-- 1. Parties performance indexes
CREATE INDEX IF NOT EXISTS idx_parties_party_code ON parties(party_code);
CREATE INDEX IF NOT EXISTS idx_parties_party_name ON parties(party_name);
CREATE INDEX IF NOT EXISTS idx_parties_mobile ON parties(mobile);
CREATE INDEX IF NOT EXISTS idx_parties_city_area ON parties(city, area);
CREATE INDEX IF NOT EXISTS idx_parties_delivery_route ON parties(delivery_route);
CREATE INDEX IF NOT EXISTS idx_parties_status_salesman ON parties(status, assigned_salesman_id);
CREATE INDEX IF NOT EXISTS idx_parties_updated_at ON parties(updated_at);

-- 2. Party outstanding snapshots performance indexes
CREATE INDEX IF NOT EXISTS idx_party_outstanding_snapshots_party ON party_outstanding_snapshots(party_id, snapshot_date DESC);

-- 3. Orders & items lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_party_date ON orders(party_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_prod ON order_items(order_id, product_id);

-- 4. Products & Batches stock indexes
CREATE INDEX IF NOT EXISTS idx_products_code_name ON products(product_code, product_name);
CREATE INDEX IF NOT EXISTS idx_products_stock_qty ON products(stock_qty);
CREATE INDEX IF NOT EXISTS idx_product_batches_prod_exp ON product_batches(product_id, expiry_date);
