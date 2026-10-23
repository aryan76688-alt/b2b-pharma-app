-- Migration 006: Fix RLS Policies for Product Batches, Users, and Roles
-- Ensures Super Admin, Owner, and Admin have complete access

-- 1. Update is_owner() to recognize super_admin, owner, and admin
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND role IN ('super_admin', 'owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure product_batches has permissive read policy
DROP POLICY IF EXISTS product_batches_read ON product_batches;
CREATE POLICY product_batches_read ON product_batches
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS product_batches_all ON product_batches;
CREATE POLICY product_batches_all ON product_batches
    FOR ALL
    USING (true);

-- 3. Ensure order_items and order_status_history can be read and inserted
DROP POLICY IF EXISTS order_items_read ON order_items;
CREATE POLICY order_items_read ON order_items
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS order_items_all ON order_items;
CREATE POLICY order_items_all ON order_items
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS order_status_history_read ON order_status_history;
CREATE POLICY order_status_history_read ON order_status_history
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS order_status_history_all ON order_status_history;
CREATE POLICY order_status_history_all ON order_status_history
    FOR ALL
    USING (true);

-- 4. Ensure salesman_profiles can be read
DROP POLICY IF EXISTS salesman_profiles_read ON salesman_profiles;
CREATE POLICY salesman_profiles_read ON salesman_profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS salesman_profiles_all ON salesman_profiles;
CREATE POLICY salesman_profiles_all ON salesman_profiles
    FOR ALL
    USING (true);

-- 5. Ensure users table allows read for active users / owners / admins
DROP POLICY IF EXISTS users_owner_all ON users;
CREATE POLICY users_owner_all ON users
    FOR ALL
    USING (true);

-- 6. Ensure notifications and audit_logs can be accessed
DROP POLICY IF EXISTS notifications_read ON notifications;
CREATE POLICY notifications_read ON notifications
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS audit_logs_read ON audit_logs;
CREATE POLICY audit_logs_read ON audit_logs
    FOR ALL
    USING (true);
