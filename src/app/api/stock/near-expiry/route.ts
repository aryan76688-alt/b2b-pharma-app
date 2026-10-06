import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    // Get threshold from app_settings
    const settingsRes = await query(`SELECT value FROM app_settings WHERE key = 'near_expiry_threshold'`);
    const thresholdDays = settingsRes.rows.length > 0 ? parseInt(settingsRes.rows[0].value.replace(/['"]/g, '')) || 90 : 90;

    const batchesRes = await query(`
      SELECT 
        pb.id as batch_id,
        pb.batch_no,
        pb.expiry_date,
        pb.stock_qty,
        pb.mrp,
        pb.ptr,
        EXTRACT(DAY FROM (pb.expiry_date::timestamp - CURRENT_DATE::timestamp)) as days_remaining,
        p.product_name,
        p.product_code,
        p.company
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.expiry_date IS NOT NULL 
        AND pb.stock_qty > 0
        AND pb.expiry_date >= CURRENT_DATE 
        AND pb.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY pb.expiry_date ASC
    `, [thresholdDays]);

    const totalQty = batchesRes.rows.reduce((acc, row) => acc + row.stock_qty, 0);
    const totalValue = batchesRes.rows.reduce((acc, row) => acc + (row.stock_qty * row.ptr), 0);

    return NextResponse.json({
      success: true,
      thresholdDays,
      totalBatches: batchesRes.rows.length,
      totalQty,
      totalValue,
      items: batchesRes.rows.map(r => ({
        id: r.batch_id,
        batchNo: r.batch_no,
        expiryDate: r.expiry_date,
        daysRemaining: parseInt(r.days_remaining),
        stockQty: r.stock_qty,
        mrp: parseFloat(r.mrp),
        ptr: parseFloat(r.ptr),
        productName: r.product_name,
        productCode: r.product_code,
        company: r.company
      }))
    });
  } catch (error: any) {
    console.error('Near Expiry Error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch near expiry stock' } },
      { status: 500 }
    );
  }
}
