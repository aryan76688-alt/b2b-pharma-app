-- SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
-- Migration 001: Initial Schema
-- PostgreSQL 15+ / Supabase Compatible

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'salesman')),
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    employee_code VARCHAR(50) UNIQUE,
    profile_photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    first_login BOOLEAN NOT NULL DEFAULT true,
    mpin_created BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. USER SECURITY TABLE (Sensitive credentials, NEVER returned in standard API responses)
CREATE TABLE IF NOT EXISTS user_security (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    mpin_hash TEXT,
    mpin_salt TEXT,
    mpin_attempts INT NOT NULL DEFAULT 0,
    mpin_locked_until TIMESTAMPTZ,
    last_mpin_login_at TIMESTAMPTZ,
    force_password_reset BOOLEAN NOT NULL DEFAULT false,
    force_mpin_reset BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SALESMAN PROFILES TABLE
CREATE TABLE IF NOT EXISTS salesman_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    territory VARCHAR(150) NOT NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_amount NUMERIC(14, 2) NOT NULL DEFAULT 100000.00,
    manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PARTIES TABLE (Chemists, Retailers, Hospitals)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code VARCHAR(50) NOT NULL UNIQUE,
    party_name VARCHAR(200) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    gst_number VARCHAR(30),
    address TEXT NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100) NOT NULL,
    party_type VARCHAR(30) NOT NULL DEFAULT 'chemist' CHECK (party_type IN ('retailer', 'chemist', 'hospital', 'other')),
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    assigned_salesman_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    company VARCHAR(150) NOT NULL DEFAULT 'Shreeji 7',
    category VARCHAR(100) NOT NULL DEFAULT 'Tablet' CHECK (category IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Other')),
    packing VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    hsn VARCHAR(20),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    mrp NUMERIC(10, 2) NOT NULL,
    ptr NUMERIC(10, 2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    free_qty INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 20,
    default_scheme VARCHAR(50) DEFAULT '10+2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PRODUCT BATCHES TABLE
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_no VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    mrp NUMERIC(10, 2) NOT NULL,
    ptr NUMERIC(10, 2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    free_qty INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_batch UNIQUE (product_id, batch_no)
);

-- 7. SCHEMES TABLE
CREATE TABLE IF NOT EXISTS schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_name VARCHAR(150) NOT NULL,
    description TEXT,
    scheme_type VARCHAR(30) NOT NULL DEFAULT 'quantity_bonus' CHECK (scheme_type IN ('quantity_bonus', 'flat_discount', 'tiered')),
    buy_quantity INT NOT NULL DEFAULT 10,
    free_quantity INT NOT NULL DEFAULT 2,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'expired')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    salesman_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'dispatched', 'delivered', 'cancelled')),
    order_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    delivery_date TIMESTAMPTZ,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_quantity INT NOT NULL DEFAULT 0,
    total_free_quantity INT NOT NULL DEFAULT 0,
    remarks TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ORDER ITEMS TABLE
-- CRITICAL INVARIANT: quantity (billed) and free_quantity (unbilled) MUST BE SEPARATE.
-- line_total is strictly computed from (quantity * ptr) - discount_amount.
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
    free_quantity INT NOT NULL DEFAULT 0 CHECK (free_quantity >= 0),
    ptr NUMERIC(10, 2) NOT NULL,
    mrp NUMERIC(10, 2) NOT NULL,
    scheme_id UUID REFERENCES schemes(id) ON DELETE SET NULL,
    scheme_name VARCHAR(50),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. PARTY TRANSACTIONS TABLE (Party Ledger)
CREATE TABLE IF NOT EXISTS party_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('opening', 'invoice', 'payment', 'adjustment', 'credit_note', 'debit_note')),
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12, 2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. PARTY OUTSTANDING SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS party_outstanding_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_bill_date DATE,
    last_payment_date DATE,
    total_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_days INT NOT NULL DEFAULT 0,
    total_bills INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_party_snapshot UNIQUE (party_id, snapshot_date)
);

-- 13. BULK IMPORT METADATA TABLES
CREATE TABLE IF NOT EXISTS stock_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS party_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS outstanding_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. IMPORT ERRORS LOG TABLE
CREATE TABLE IF NOT EXISTS import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type VARCHAR(30) NOT NULL CHECK (import_type IN ('stock', 'parties', 'outstanding')),
    import_id UUID NOT NULL,
    row_number INT NOT NULL,
    field_name VARCHAR(100),
    error_message TEXT NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
