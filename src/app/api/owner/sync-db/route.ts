import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS location_address TEXT
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salesman_id UUID REFERENCES users(id) ON DELETE SET NULL,
        party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        payment_mode VARCHAR(50) NOT NULL,
        reference_no VARCHAR(100),
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS scheme_buy INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS scheme_get INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0
    `);

    return NextResponse.json({
      success: true,
      message: 'Database Schema Synchronized for Phase 2 Features (GPS, Schemes, Payments)'
    });
  } catch (error: any) {
    console.error('DB Sync Error:', error);
    return handleAuthError(error);
  }
}
