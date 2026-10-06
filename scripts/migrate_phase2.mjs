import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log('Starting Phase 2 Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8), ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8), ADD COLUMN IF NOT EXISTS location_address TEXT`);
    console.log('Added GPS tracking to orders.');
    await client.query(`CREATE TABLE IF NOT EXISTS collections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), salesman_id UUID REFERENCES users(id) ON DELETE SET NULL, party_id UUID REFERENCES parties(id) ON DELETE CASCADE, amount DECIMAL(12, 2) NOT NULL, payment_mode VARCHAR(50) NOT NULL, reference_no VARCHAR(100), status VARCHAR(50) DEFAULT 'PENDING', notes TEXT, collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    console.log('Created collections table.');
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS scheme_buy INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS scheme_get INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0`);
    console.log('Added scheme columns.');
    await client.query('COMMIT');
    console.log('Success!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}
runMigration();
