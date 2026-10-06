-- SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
-- Migration 003: Row Level Security (RLS) Policies
-- PostgreSQL / Supabase Compatible

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_outstanding_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE outstanding_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. USERS POLICIES
DROP POLICY IF EXISTS users_owner_all ON users;
CREATE POLICY users_owner_all ON users
    FOR ALL
    USING (is_owner() OR id = nullif(current_setting('app.current_user_id', true), '')::uuid);

-- 2. USER SECURITY POLICIES (Only system service role / direct functions can access)
DROP POLICY IF EXISTS user_security_isolation ON user_security;
CREATE POLICY user_security_isolation ON user_security
    FOR ALL
    USING (is_owner());

-- 3. PARTIES POLICIES
DROP POLICY IF EXISTS parties_read ON parties;
CREATE POLICY parties_read ON parties
    FOR SELECT
    USING (is_owner() OR assigned_salesman_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS parties_insert ON parties;
CREATE POLICY parties_insert ON parties
    FOR INSERT
    WITH CHECK (true);

-- 4. ORDERS POLICIES
DROP POLICY IF EXISTS orders_read ON orders;
CREATE POLICY orders_read ON orders
    FOR SELECT
    USING (is_owner() OR salesman_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS orders_insert ON orders;
CREATE POLICY orders_insert ON orders
    FOR INSERT
    WITH CHECK (salesman_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS orders_owner_update ON orders;
CREATE POLICY orders_owner_update ON orders
    FOR UPDATE
    USING (is_owner());

-- 5. PRODUCTS & SCHEMES POLICIES
DROP POLICY IF EXISTS products_read ON products;
CREATE POLICY products_read ON products
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS schemes_read ON schemes;
CREATE POLICY schemes_read ON schemes
    FOR SELECT
    USING (true);

-- 6. IMPORTS (OWNER ONLY)
DROP POLICY IF EXISTS stock_imports_owner ON stock_imports;
CREATE POLICY stock_imports_owner ON stock_imports
    FOR ALL
    USING (is_owner());

DROP POLICY IF EXISTS party_imports_owner ON party_imports;
CREATE POLICY party_imports_owner ON party_imports
    FOR ALL
    USING (is_owner());

DROP POLICY IF EXISTS outstanding_imports_owner ON outstanding_imports;
CREATE POLICY outstanding_imports_owner ON outstanding_imports
    FOR ALL
    USING (is_owner());
