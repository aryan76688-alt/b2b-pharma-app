import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const partyId = searchParams.get('partyId');
    const isValidUuid = Boolean(partyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partyId));

    let rows: any[] = [];

    if (isValidUuid) {
      // 1. First attempt: Items ordered by this specific party
      const partyRes = await query(
        `SELECT 
          oi.product_id as "productId",
          p.product_code as "productCode",
          p.product_name as "productName",
          p.packing,
          p.company,
          p.ptr,
          p.mrp,
          p.gst_percent as "gstPercent",
          COUNT(oi.id)::int as "orderFrequency",
          COALESCE(ROUND(AVG(oi.quantity)), 10)::int as "typicalQty",
          COALESCE(MAX(pb.id), (SELECT id FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1)) as "defaultBatchId",
          COALESCE(MAX(pb.batch_no), (SELECT batch_no FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1), 'STD') as "defaultBatchNo",
          COALESCE(MAX(pb.stock_qty), p.stock_qty, 100)::int as "currentStock"
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.stock_qty > 0
        WHERE o.party_id = $1
        GROUP BY oi.product_id, p.product_code, p.product_name, p.packing, p.company, p.ptr, p.mrp, p.gst_percent, p.stock_qty, p.id
        ORDER BY "orderFrequency" DESC, MAX(o.created_at) DESC
        LIMIT 10;`,
        [partyId]
      );
      rows = partyRes.rows;
    }

    // 2. If party has fewer than 4 repeat items, supplement with top overall fast-moving items
    if (rows.length < 4) {
      const existingProductIds = rows.map((r: any) => r.productId);
      const limit = 10 - rows.length;

      let fallbackRes;
      if (existingProductIds.length > 0) {
        fallbackRes = await query(
          `SELECT 
            p.id as "productId",
            p.product_code as "productCode",
            p.product_name as "productName",
            p.packing,
            p.company,
            p.ptr,
            p.mrp,
            p.gst_percent as "gstPercent",
            COALESCE(COUNT(oi.id), 0)::int as "orderFrequency",
            10 as "typicalQty",
            (SELECT id FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1) as "defaultBatchId",
            COALESCE((SELECT batch_no FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1), 'STD') as "defaultBatchNo",
            COALESCE(p.stock_qty, 100)::int as "currentStock"
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          WHERE p.id != ALL($1)
          GROUP BY p.id, p.product_code, p.product_name, p.packing, p.company, p.ptr, p.mrp, p.gst_percent, p.stock_qty
          ORDER BY "orderFrequency" DESC, p.stock_qty DESC
          LIMIT $2;`,
          [existingProductIds, limit]
        );
      } else {
        fallbackRes = await query(
          `SELECT 
            p.id as "productId",
            p.product_code as "productCode",
            p.product_name as "productName",
            p.packing,
            p.company,
            p.ptr,
            p.mrp,
            p.gst_percent as "gstPercent",
            COALESCE(COUNT(oi.id), 0)::int as "orderFrequency",
            10 as "typicalQty",
            (SELECT id FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1) as "defaultBatchId",
            COALESCE((SELECT batch_no FROM product_batches WHERE product_id = p.id AND stock_qty > 0 LIMIT 1), 'STD') as "defaultBatchNo",
            COALESCE(p.stock_qty, 100)::int as "currentStock"
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          GROUP BY p.id, p.product_code, p.product_name, p.packing, p.company, p.ptr, p.mrp, p.gst_percent, p.stock_qty
          ORDER BY "orderFrequency" DESC, p.stock_qty DESC
          LIMIT $1;`,
          [limit]
        );
      }
      rows = [...rows, ...fallbackRes.rows];
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
