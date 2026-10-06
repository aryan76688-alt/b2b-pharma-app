-- SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
-- Migration 002: Indexes and Constraints

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON user_security(user_id);

CREATE INDEX IF NOT EXISTS idx_salesman_profiles_user ON salesman_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesman_profiles_empcode ON salesman_profiles(employee_code);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE INDEX IF NOT EXISTS idx_product_batches_prod ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_batch ON product_batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);

CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(party_name);
CREATE INDEX IF NOT EXISTS idx_parties_code ON parties(party_code);
CREATE INDEX IF NOT EXISTS idx_parties_mobile ON parties(mobile);
CREATE INDEX IF NOT EXISTS idx_parties_salesman ON parties(assigned_salesman_id);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_salesman ON orders(salesman_id);
CREATE INDEX IF NOT EXISTS idx_orders_party ON orders(party_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

CREATE INDEX IF NOT EXISTS idx_party_tx_party ON party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_tx_date ON party_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_party_outstanding_party ON party_outstanding_snapshots(party_id);
CREATE INDEX IF NOT EXISTS idx_party_outstanding_date ON party_outstanding_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
