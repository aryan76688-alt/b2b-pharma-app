import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shreeji_healthcare';
const pool = new pg.Pool({ connectionString });

async function runSeed() {
  console.log('🌱 Seeding Shreeji Healthcare Database...');
  const seedFile = path.join(__dirname, '../database/seed/001_seed_data.sql');

  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(seedFile, 'utf8');
    await client.query(sql);
    console.log('✅ Seed data inserted successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
