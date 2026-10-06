# DATABASE SPECIFICATION & SCHEMA
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”

---

## 1. Schema Overview

The database is built on PostgreSQL 15+ (fully compatible with Supabase).
All tables use:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- Foreign keys with referential integrity (`ON DELETE RESTRICT` or `ON DELETE CASCADE` where appropriate)
- Row Level Security (RLS) enabled on all tables

---

## 2. Table Specifications

### 2.1 `users`
Core user account record.
- `id` UUID PRIMARY KEY
- `auth_user_id` UUID UNIQUE (maps to Supabase auth.users or internal auth identifier)
- `role` VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'salesman'))
- `full_name` VARCHAR(150) NOT NULL
- `mobile` VARCHAR(20) NOT NULL UNIQUE
- `email` VARCHAR(150) NOT NULL UNIQUE
- `username` VARCHAR(50) NOT NULL UNIQUE
- `employee_code` VARCHAR(50) UNIQUE
- `profile_photo_url` TEXT
- `status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
- `first_login` BOOLEAN NOT NULL DEFAULT true
- `mpin_created` BOOLEAN NOT NULL DEFAULT false
- `last_login_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.2 `user_security`
Stores sensitive authentication hashes and rate-limiting lockout state.
**NEVER returned via standard API endpoints.**
- `id` UUID PRIMARY KEY
- `user_id` UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
- `password_hash` TEXT NOT NULL
- `mpin_hash` TEXT (PBKDF2/SHA-256 hashed 4-digit MPIN + salt)
- `mpin_salt` TEXT
- `mpin_attempts` INT NOT NULL DEFAULT 0
- `mpin_locked_until` TIMESTAMPTZ
- `last_mpin_login_at` TIMESTAMPTZ
- `force_password_reset` BOOLEAN NOT NULL DEFAULT false
- `force_mpin_reset` BOOLEAN NOT NULL DEFAULT false
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.3 `salesman_profiles`
Salesman-specific employment, operational territory, and quota targets.
- `id` UUID PRIMARY KEY
- `user_id` UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
- `employee_code` VARCHAR(50) NOT NULL
- `territory` VARCHAR(150) NOT NULL
- `joining_date` DATE NOT NULL DEFAULT CURRENT_DATE
- `target_amount` NUMERIC(14, 2) NOT NULL DEFAULT 100000.00
- `manager_user_id` UUID REFERENCES users(id)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.4 `parties`
Retailers, chemists, hospitals, and pharmacies.
- `id` UUID PRIMARY KEY
- `party_code` VARCHAR(50) NOT NULL UNIQUE
- `party_name` VARCHAR(200) NOT NULL
- `mobile` VARCHAR(20) NOT NULL
- `email` VARCHAR(150)
- `gst_number` VARCHAR(30)
- `address` TEXT NOT NULL
- `state` VARCHAR(100) NOT NULL DEFAULT 'Gujarat'
- `city` VARCHAR(100) NOT NULL
- `area` VARCHAR(100) NOT NULL
- `party_type` VARCHAR(30) NOT NULL DEFAULT 'chemist' CHECK (party_type IN ('retailer', 'chemist', 'hospital', 'other'))
- `credit_limit` NUMERIC(12, 2) NOT NULL DEFAULT 50000.00
- `opening_balance` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `assigned_salesman_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.5 `products`
Pharmaceutical catalog items with standard pricing, packing, and default schemes.
- `id` UUID PRIMARY KEY
- `product_code` VARCHAR(50) NOT NULL UNIQUE
- `product_name` VARCHAR(200) NOT NULL
- `generic_name` VARCHAR(200)
- `company` VARCHAR(150) NOT NULL
- `category` VARCHAR(100) NOT NULL CHECK (category IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Other'))
- `packing` VARCHAR(50) NOT NULL
- `barcode` VARCHAR(50)
- `hsn` VARCHAR(20)
- `gst_percent` NUMERIC(5, 2) NOT NULL DEFAULT 12.00
- `mrp` NUMERIC(10, 2) NOT NULL
- `ptr` NUMERIC(10, 2) NOT NULL
- `stock_qty` INT NOT NULL DEFAULT 0
- `free_qty` INT NOT NULL DEFAULT 0
- `minimum_stock` INT NOT NULL DEFAULT 20
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.6 `product_batches`
Specific batches of products with distinct expiry dates and rates.
- `id` UUID PRIMARY KEY
- `product_id` UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
- `batch_no` VARCHAR(50) NOT NULL
- `expiry_date` DATE NOT NULL
- `mrp` NUMERIC(10, 2) NOT NULL
- `ptr` NUMERIC(10, 2) NOT NULL
- `stock_qty` INT NOT NULL DEFAULT 0
- `free_qty` INT NOT NULL DEFAULT 0
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()
- UNIQUE (product_id, batch_no)

### 2.7 `schemes`
Trade promotional schemes (e.g. 10+2, 5+1, Flat % Discount).
- `id` UUID PRIMARY KEY
- `scheme_name` VARCHAR(150) NOT NULL
- `description` TEXT
- `scheme_type` VARCHAR(30) NOT NULL CHECK (scheme_type IN ('quantity_bonus', 'flat_discount', 'tiered'))
- `buy_quantity` INT NOT NULL DEFAULT 10
- `free_quantity` INT NOT NULL DEFAULT 2
- `discount_percent` NUMERIC(5, 2) NOT NULL DEFAULT 0.00
- `start_date` DATE NOT NULL DEFAULT CURRENT_DATE
- `end_date` DATE NOT NULL
- `status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'expired'))
- `created_by` UUID REFERENCES users(id)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.8 `orders`
Primary order header.
- `id` UUID PRIMARY KEY
- `order_number` VARCHAR(50) NOT NULL UNIQUE
- `party_id` UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT
- `salesman_id` UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- `status` VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'dispatched', 'delivered', 'cancelled'))
- `order_date` TIMESTAMPTZ NOT NULL DEFAULT now()
- `subtotal` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `discount_amount` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `total_amount` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `total_quantity` INT NOT NULL DEFAULT 0
- `total_free_quantity` INT NOT NULL DEFAULT 0
- `remarks` TEXT
- `rejection_reason` TEXT
- `approved_by` UUID REFERENCES users(id)
- `approved_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.9 `order_items`
Individual line items in an order.
**CRITICAL: `quantity` (billed) and `free_quantity` (unbilled bonus) are stored separately.**
- `id` UUID PRIMARY KEY
- `order_id` UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
- `product_id` UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT
- `batch_id` UUID REFERENCES product_batches(id) ON DELETE SET NULL
- `quantity` INT NOT NULL CHECK (quantity >= 1)
- `free_quantity` INT NOT NULL DEFAULT 0 CHECK (free_quantity >= 0)
- `ptr` NUMERIC(10, 2) NOT NULL
- `mrp` NUMERIC(10, 2) NOT NULL
- `scheme_id` UUID REFERENCES schemes(id) ON DELETE SET NULL
- `discount_amount` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
- `line_total` NUMERIC(12, 2) NOT NULL -- Computed as: (quantity * ptr) - discount_amount
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 2.10 `order_status_history`
Complete immutable audit trail of order transitions.
- `id` UUID PRIMARY KEY
- `order_id` UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
- `old_status` VARCHAR(20)
- `new_status` VARCHAR(20) NOT NULL
- `changed_by` UUID REFERENCES users(id)
- `remarks` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.11 `party_transactions`
Party ledger records (Invoices, Payments, Credit Notes).
- `id` UUID PRIMARY KEY
- `party_id` UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE
- `transaction_date` TIMESTAMPTZ NOT NULL DEFAULT now()
- `transaction_type` VARCHAR(30) NOT NULL CHECK (transaction_type IN ('opening', 'invoice', 'payment', 'adjustment', 'credit_note', 'debit_note'))
- `reference_type` VARCHAR(50)
- `reference_id` VARCHAR(100)
- `debit` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `credit` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `balance` NUMERIC(12, 2) NOT NULL
- `remarks` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.12 `party_outstanding_snapshots`
Daily outstanding balances computed from Owner Excel imports.
- `id` UUID PRIMARY KEY
- `party_id` UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE
- `snapshot_date` DATE NOT NULL DEFAULT CURRENT_DATE
- `last_bill_date` DATE
- `last_payment_date` DATE
- `total_outstanding` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `total_received` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `pending_days` INT NOT NULL DEFAULT 0
- `total_bills` INT NOT NULL DEFAULT 0
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.13 `stock_imports`, `party_imports`, `outstanding_imports`
Tracking metadata for bulk Excel operations.
- `id` UUID PRIMARY KEY
- `uploaded_by` UUID NOT NULL REFERENCES users(id)
- `file_name` VARCHAR(255) NOT NULL
- `file_url` TEXT
- `total_rows` INT NOT NULL DEFAULT 0
- `valid_rows` INT NOT NULL DEFAULT 0
- `invalid_rows` INT NOT NULL DEFAULT 0
- `duplicate_rows` INT NOT NULL DEFAULT 0
- `status` VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed'))
- `error_summary` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.14 `import_errors`
Line-level import failure logs.
- `id` UUID PRIMARY KEY
- `import_type` VARCHAR(30) NOT NULL CHECK (import_type IN ('stock', 'parties', 'outstanding'))
- `import_id` UUID NOT NULL
- `row_number` INT NOT NULL
- `field_name` VARCHAR(100)
- `error_message` TEXT NOT NULL
- `raw_data` JSONB
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.15 `notifications`
In-app notification messages.
- `id` UUID PRIMARY KEY
- `user_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `type` VARCHAR(50) NOT NULL
- `title` VARCHAR(150) NOT NULL
- `message` TEXT NOT NULL
- `reference_type` VARCHAR(50)
- `reference_id` VARCHAR(100)
- `is_read` BOOLEAN NOT NULL DEFAULT false
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2.16 `audit_logs`
System-wide security and operations ledger.
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `action` VARCHAR(100) NOT NULL
- `entity_type` VARCHAR(50) NOT NULL
- `entity_id` VARCHAR(100)
- `old_data` JSONB
- `new_data` JSONB
- `ip_address` VARCHAR(50)
- `user_agent` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()

---

## 3. Database Indexes Strategy

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);

CREATE INDEX idx_parties_name ON parties(party_name);
CREATE INDEX idx_parties_code ON parties(party_code);
CREATE INDEX idx_parties_mobile ON parties(mobile);
CREATE INDEX idx_parties_salesman ON parties(assigned_salesman_id);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_salesman ON orders(salesman_id);
CREATE INDEX idx_orders_party ON orders(party_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE INDEX idx_party_tx_party ON party_transactions(party_id);
CREATE INDEX idx_party_outstanding_party ON party_outstanding_snapshots(party_id);
CREATE INDEX idx_party_outstanding_date ON party_outstanding_snapshots(snapshot_date);
```
