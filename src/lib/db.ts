import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/shreeji_healthcare';

// Global singleton to prevent pool exhaustion during development hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: connectionString.includes('supabase.co') || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });
} else {
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  pool = global._pgPool;
}

let indexesEnsured = false;
export async function ensureDatabaseIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    const sql = `
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS address_line_3 TEXT;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS delivery_route VARCHAR(150);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS landline VARCHAR(50);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS drug_licenses TEXT[];
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS current_outstanding NUMERIC(12,2) DEFAULT 0.00;
      CREATE INDEX IF NOT EXISTS idx_parties_lat_lng ON parties(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_parties_party_code ON parties(party_code);
      CREATE INDEX IF NOT EXISTS idx_parties_party_name ON parties(party_name);
      CREATE INDEX IF NOT EXISTS idx_parties_mobile ON parties(mobile);
      CREATE INDEX IF NOT EXISTS idx_parties_city_area ON parties(city, area);
      CREATE INDEX IF NOT EXISTS idx_parties_delivery_route ON parties(delivery_route);
      CREATE INDEX IF NOT EXISTS idx_parties_status_salesman ON parties(status, assigned_salesman_id);
      CREATE INDEX IF NOT EXISTS idx_party_outstanding_snapshots_party ON party_outstanding_snapshots(party_id, snapshot_date DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_party_date ON orders(party_id, order_date DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date DESC);

      ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'PCS';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rack_no VARCHAR(50);
      ALTER TABLE products ALTER COLUMN packing DROP NOT NULL;
      ALTER TABLE products ALTER COLUMN packing SET DEFAULT '10x10';
      ALTER TABLE product_batches ALTER COLUMN expiry_date DROP NOT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0.00;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 12.00;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0.00;

      ALTER TABLE stock_imports ALTER COLUMN uploaded_by DROP NOT NULL;
      DROP POLICY IF EXISTS "stock_imports_all" ON stock_imports;
      CREATE POLICY "stock_imports_all" ON stock_imports FOR ALL USING (true) WITH CHECK (true);

      CREATE TABLE IF NOT EXISTS user_device_controls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        device_name varchar(100) DEFAULT 'Android Mobile',
        device_model varchar(100) DEFAULT 'Samsung Galaxy / Redmi',
        os_version varchar(50) DEFAULT 'Android 14',
        app_version varchar(50) DEFAULT '1.2.0 PWA',
        storage_access boolean DEFAULT true,
        storage_quota_mb integer DEFAULT 1024,
        storage_used_mb numeric(10,2) DEFAULT 48.5,
        camera_access boolean DEFAULT true,
        camera_mode varchar(50) DEFAULT 'rear_and_front',
        mic_access boolean DEFAULT true,
        mic_mode varchar(50) DEFAULT 'emergency_only',
        remote_locked boolean DEFAULT false,
        tracking_enabled boolean DEFAULT true,
        last_synced_at timestamptz DEFAULT timezone('utc'::text, now()),
        updated_at timestamptz DEFAULT timezone('utc'::text, now()),
        updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT unique_user_device UNIQUE (user_id)
      );

      INSERT INTO user_device_controls (user_id)
      SELECT id FROM users
      ON CONFLICT (user_id) DO NOTHING;
    `;
    await pool.query(sql);

    // Auto-seed default Super Admin (Aryan180607) and Owner (Tushar@9263)
    try {
      await pool.query(`
        -- Migrate legacy Tushar9263 username if present
        UPDATE users SET username = 'Tushar@9263' WHERE username = 'Tushar9263';

        INSERT INTO users (role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
        VALUES ('super_admin', 'Aryan Darji', '9924544283', 'aryan180607@shreeji.local', 'Aryan180607', 'SUPER-001', 'active', false, false)
        ON CONFLICT (username) DO UPDATE 
        SET role = 'super_admin', full_name = 'Aryan Darji', status = 'active';

        INSERT INTO user_security (user_id, password_hash)
        SELECT id, '$2a$10$JQW.0DtsDFRh1AugKsBLLO5VtYQ8yW2QDIVYeBV9f1XYUO749nvmq'
        FROM users WHERE username = 'Aryan180607'
        ON CONFLICT (user_id) DO UPDATE
        SET password_hash = '$2a$10$JQW.0DtsDFRh1AugKsBLLO5VtYQ8yW2QDIVYeBV9f1XYUO749nvmq';

        INSERT INTO users (role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
        VALUES ('owner', 'Tushar Patel', '9876543210', 'tushar9263@shreeji.local', 'Tushar@9263', 'OWNER-001', 'active', false, false)
        ON CONFLICT (username) DO UPDATE
        SET role = 'owner', full_name = 'Tushar Patel', status = 'active';

        INSERT INTO user_security (user_id, password_hash)
        SELECT id, '$2a$10$dcJ6PtI3eEQVx.of1hJJFOE0.miHHxIYstLiB7KhkTeLL2lWvGXXC'
        FROM users WHERE username = 'Tushar@9263'
        ON CONFLICT (user_id) DO UPDATE
        SET password_hash = '$2a$10$dcJ6PtI3eEQVx.of1hJJFOE0.miHHxIYstLiB7KhkTeLL2lWvGXXC';
      `);
    } catch {}
    indexesEnsured = true;
  } catch (err) {
    // Non-blocking
  }
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (!indexesEnsured) {
    ensureDatabaseIndexes().catch(() => {});
  }
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`[DB Slow Query] ${duration}ms: ${text.slice(0, 80)}...`);
    }
    return res;
  } catch (error) {
    console.error('[DB Query Error]', { text, error });
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
