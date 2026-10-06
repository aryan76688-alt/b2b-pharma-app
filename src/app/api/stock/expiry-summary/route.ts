import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    // Get threshold from app_settings
    const settingsRes = await query(`SELECT value FROM app_settings WHERE key = 'near_expiry_threshold'`);
    const thresholdDays = settingsRes.rows.length > 0 ? parseInt(settingsRes.rows[0].value.replace(/['"]/g, '')) || 90 : 90;

    const summaryRes = await query(`
      WITH batch_status AS (
        SELECT 
          id,
          CASE 
            WHEN stock_qty <= 0 THEN 'OUT_OF_STOCK'
            WHEN expiry_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN expiry_date <= CURRENT_DATE + ($1 || ' days')::interval THEN 'NEAR_EXPIRY'
            ELSE 'ACTIVE'
          END as status
        FROM product_batches
        WHERE expiry_date IS NOT NULL
      )
      SELECT 
        COUNT(CASE WHEN status = 'NEAR_EXPIRY' THEN 1 END) as near_expiry,
        COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active
      FROM batch_status;
    `, [thresholdDays]);

    return NextResponse.json({
      success: true,
      summary: {
        nearExpiry: parseInt(summaryRes.rows[0]?.near_expiry || 0),
        expired: parseInt(summaryRes.rows[0]?.expired || 0),
        active: parseInt(summaryRes.rows[0]?.active || 0)
      }
    });
  } catch (error: any) {
    console.error('Expiry Summary Error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch expiry summary' } },
      { status: 500 }
    );
  }
}
