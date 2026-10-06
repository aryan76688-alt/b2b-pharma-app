import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const batchesRes = await query(`
      SELECT 
        pb.id as batch_id,
        pb.batch_no,
        pb.expiry_date,
        pb.stock_qty,
        pb.mrp,
        pb.ptr,
        EXTRACT(DAY FROM (CURRENT_DATE::timestamp - pb.expiry_date::timestamp)) as days_expired,
        p.product_name,
        p.product_code,
        p.company
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.expiry_date IS NOT NULL 
        AND pb.stock_qty > 0
        AND pb.expiry_date < CURRENT_DATE
      ORDER BY pb.expiry_date ASC
    `);

    return NextResponse.json({
      success: true,
      totalBatches: batchesRes.rows.length,
      items: batchesRes.rows.map(r => ({
        id: r.batch_id,
        batchNo: r.batch_no,
        expiryDate: r.expiry_date,
        daysExpired: parseInt(r.days_expired),
        stockQty: r.stock_qty,
        mrp: parseFloat(r.mrp),
        ptr: parseFloat(r.ptr),
        productName: r.product_name,
        productCode: r.product_code,
        company: r.company
      }))
    });
  } catch (error: any) {
    console.error('Expired Error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch expired stock' } },
      { status: 500 }
    );
  }
}
