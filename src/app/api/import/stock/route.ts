import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();
    const { fileName, products, batches, totalRows } = body;

    if (!products || !batches) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid payload.' } },
        { status: 400 }
      );
    }

    let productsCreated = 0;
    let productsUpdated = 0;
    let batchesCreated = 0;
    let batchesUpdated = 0;

    await withTransaction(async (client) => {
      // Record import metadata
      const importMetaRes = await client.query(
        `INSERT INTO stock_imports (uploaded_by, file_name, total_rows, status)
         VALUES ($1, $2, $3, 'processing')
         RETURNING id`,
        [owner.id, fileName, totalRows]
      );
      const importId = importMetaRes.rows[0].id;

      // 1. Upsert Products
      for (const p of products) {
        const pRes = await client.query(
          `SELECT id FROM products WHERE product_code = $1`,
          [p.productCode]
        );
        if (pRes.rows.length > 0) {
          await client.query(
            `UPDATE products 
             SET product_name = COALESCE($2, product_name), 
                 unit = COALESCE($3, unit), 
                 company = COALESCE($4, company),
                 updated_at = NOW()
             WHERE id = $1`,
            [pRes.rows[0].id, p.productName, p.unit, p.company]
          );
          productsUpdated++;
        } else {
          await client.query(
            `INSERT INTO products (product_code, product_name, unit, company, mrp, ptr, stock_qty)
             VALUES ($1, $2, $3, $4, 0, 0, 0)`,
             [p.productCode, p.productName, p.unit || 'PCS', p.company || 'Unknown']
          );
          productsCreated++;
        }
      }

      // 2. Upsert Batches & update product stock, mrp, ptr (defaults for legacy reasons)
      for (const b of batches) {
        // Find product
        const pRes = await client.query(
          `SELECT id FROM products WHERE product_code = $1`,
          [b.productCode]
        );
        if (pRes.rows.length === 0) continue;
        const productId = pRes.rows[0].id;
        const batchNo = b.batchNo || 'DEFAULT';

        // Check existing batch
        const bRes = await client.query(
          `SELECT id FROM product_batches WHERE product_id = $1 AND batch_no = $2`,
          [productId, batchNo]
        );

        if (bRes.rows.length > 0) {
          // Update existing batch (snapshot replacement)
          await client.query(
            `UPDATE product_batches 
             SET stock_qty = $3, mrp = $4, ptr = $5, expiry_date = COALESCE($6, expiry_date), updated_at = NOW()
             WHERE id = $1`,
            [bRes.rows[0].id, productId, b.stockQty, b.mrp, b.ptr, b.expiryDate || null]
          );
          batchesUpdated++;
        } else {
          // Create new batch
          await client.query(
            `INSERT INTO product_batches (product_id, batch_no, stock_qty, mrp, ptr, expiry_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [productId, batchNo, b.stockQty, b.mrp, b.ptr, b.expiryDate || null]
          );
          batchesCreated++;
        }
      }

      // 3. Recalculate stock_qty for all updated products
      await client.query(`
        UPDATE products p
        SET stock_qty = COALESCE((
          SELECT SUM(stock_qty)
          FROM product_batches pb
          WHERE pb.product_id = p.id
        ), 0),
        mrp = COALESCE((
          SELECT mrp
          FROM product_batches pb
          WHERE pb.product_id = p.id
          ORDER BY expiry_date ASC NULLS LAST
          LIMIT 1
        ), p.mrp),
        ptr = COALESCE((
          SELECT ptr
          FROM product_batches pb
          WHERE pb.product_id = p.id
          ORDER BY expiry_date ASC NULLS LAST
          LIMIT 1
        ), p.ptr),
        updated_at = NOW()
        WHERE id IN (
          SELECT id FROM products WHERE product_code = ANY($1)
        )
      `, [products.map((p: any) => p.productCode)]);

      await client.query(
        `UPDATE stock_imports SET status = 'completed', valid_rows = $2 WHERE id = $1`,
        [importId, totalRows]
      );
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRows,
        productsCreated,
        productsUpdated,
        batchesCreated,
        batchesUpdated,
        purchasePriceImported: false
      }
    });

  } catch (error: any) {
    console.error('Import Error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to process import.' } },
      { status: 500 }
    );
  }
}
