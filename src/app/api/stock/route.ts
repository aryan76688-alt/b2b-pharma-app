import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'low_stock', 'near_expiry', 'out_of_stock'

    const conditions: string[] = [];
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(p.product_name) LIKE $${pIdx} OR 
        LOWER(p.product_code) LIKE $${pIdx} OR 
        LOWER(p.generic_name) LIKE $${pIdx} OR 
        LOWER(p.company) LIKE $${pIdx}
      )`);
    }

    if (status === 'out_of_stock') {
      conditions.push(`p.stock_qty <= 0`);
    } else if (status === 'in_stock') {
      conditions.push(`p.stock_qty > 0`);
    } else if (status === 'low_stock') {
      conditions.push(`p.stock_qty > 0 AND p.stock_qty <= p.minimum_stock`);
    } else if (status === 'near_expiry') {
      conditions.push(`EXISTS (SELECT 1 FROM product_batches pb WHERE pb.product_id = p.id AND pb.expiry_date >= CURRENT_DATE AND pb.expiry_date <= CURRENT_DATE + INTERVAL '120 days' AND pb.stock_qty > 0)`);
    } else if (status === 'expired') {
      conditions.push(`EXISTS (SELECT 1 FROM product_batches pb WHERE pb.product_id = p.id AND pb.expiry_date < CURRENT_DATE AND pb.stock_qty > 0)`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const productsRes = await query(
      `SELECT 
        p.id,
        p.product_code as "productCode",
        p.product_name as "productName",
        p.generic_name as "genericName",
        p.company,
        p.category,
        p.packing,
        p.barcode,
        p.hsn,
        p.gst_percent as "gstPercent",
        p.mrp,
        p.ptr,
        p.stock_qty as "stockQty",
        p.free_qty as "freeQty",
        p.minimum_stock as "minimumStock",
        p.default_scheme as "defaultScheme",
        p.created_at as "createdAt"
      FROM products p
      ${whereClause}
      ORDER BY p.product_name ASC
      LIMIT 100`,
      params
    );

    const products = productsRes.rows;

    // Fetch batches for all products
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const batchesRes = await query(
        `SELECT 
          id,
          product_id as "productId",
          batch_no as "batchNo",
          expiry_date::text as "expiryDate",
          mrp,
          ptr,
          stock_qty as "stockQty",
          free_qty as "freeQty",
          (expiry_date <= CURRENT_DATE) as "isExpired",
          (expiry_date > CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') as "isNearExpiry"
         FROM product_batches
         WHERE product_id = ANY($1)
         ORDER BY expiry_date ASC`,
        [productIds]
      );

      const batchMap = new Map<string, any[]>();
      for (const b of batchesRes.rows) {
        if (!batchMap.has(b.productId)) {
          batchMap.set(b.productId, []);
        }
        batchMap.get(b.productId)!.push(b);
      }

      for (const p of products) {
        p.batches = batchMap.get(p.id) || [];
      }
    }

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
