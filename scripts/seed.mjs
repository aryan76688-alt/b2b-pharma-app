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
  const seedDir = path.join(__dirname, '../database/seed');
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`Applying seed: ${file}...`);
      const sql = fs.readFileSync(path.join(seedDir, file), 'utf8');
      await client.query(sql);
      console.log(`✅ Seed applied: ${file}`);
    }
    console.log('🎉 All seed data inserted successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
