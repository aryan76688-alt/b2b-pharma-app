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
      ALTER TABLE products ALTER COLUMN packing DROP NOT NULL;
      ALTER TABLE products ALTER COLUMN packing SET DEFAULT '10x10';
      ALTER TABLE product_batches ALTER COLUMN expiry_date DROP NOT NULL;
    `;
    await pool.query(sql);
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
