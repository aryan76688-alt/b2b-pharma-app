import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();

    // Healthcheck / Connection test for MARG Bridge Chrome Extension
    if (body?.ping) {
      return NextResponse.json({
        success: true,
        message: `Connected to Next.js B2B App (Authorized as ${owner.fullName || 'Owner'}).`
      });
    }

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
      // Record import metadata safely
      let importId = null;
      try {
        const importMetaRes = await client.query(
          `INSERT INTO stock_imports (uploaded_by, file_name, total_rows, status)
           VALUES ($1, $2, $3, 'processing')
           RETURNING id`,
          [owner.id, fileName, totalRows]
        );
        importId = importMetaRes.rows[0]?.id;
      } catch (e) {
        // Non-blocking if stock_imports table is missing
      }

      // Default safe expiry: 2 years from today
      const defaultExpDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. Upsert Products
      for (const p of products) {
        const pCode = (p.productCode || '').trim();
        if (!pCode) continue;

        const pRes = await client.query(
          `SELECT id FROM products WHERE product_code = $1`,
          [pCode]
        );
        const packingVal = p.packing || p.unit || '10x10';
        const unitVal = p.unit || p.packing || 'PCS';
        const companyVal = p.company || 'Shreeji 7';

        if (pRes.rows.length > 0) {
          await client.query(
            `UPDATE products 
             SET product_name = COALESCE($2, product_name), 
                 packing = COALESCE($3, packing),
                 unit = COALESCE($4, unit), 
                 company = COALESCE($5, company),
                 updated_at = NOW()
             WHERE id = $1`,
            [pRes.rows[0].id, p.productName, packingVal, unitVal, companyVal]
          );
          productsUpdated++;
        } else {
          await client.query(
            `INSERT INTO products (product_code, product_name, packing, unit, company, mrp, ptr, stock_qty)
             VALUES ($1, $2, $3, $4, $5, 0, 0, 0)`,
             [pCode, p.productName, packingVal, unitVal, companyVal]
          );
          productsCreated++;
        }
      }

      // 2. Upsert Batches & update product stock, mrp, ptr
      for (const b of batches) {
        const pCode = (b.productCode || '').trim();
        if (!pCode) continue;

        const pRes = await client.query(
          `SELECT id FROM products WHERE product_code = $1`,
          [pCode]
        );
        if (pRes.rows.length === 0) continue;
        const productId = pRes.rows[0].id;
        const batchNo = (b.batchNo || 'REGULAR').trim() || 'REGULAR';
        const validExpiry = b.expiryDate && !isNaN(new Date(b.expiryDate).getTime()) ? b.expiryDate : defaultExpDate;

        // Check existing batch
        const bRes = await client.query(
          `SELECT id FROM product_batches WHERE product_id = $1 AND batch_no = $2`,
          [productId, batchNo]
        );

        if (bRes.rows.length > 0) {
          // Update existing batch
          await client.query(
            `UPDATE product_batches 
             SET stock_qty = $2, mrp = $3, ptr = $4, expiry_date = COALESCE($5, expiry_date), updated_at = NOW()
             WHERE id = $1`,
            [bRes.rows[0].id, b.stockQty, b.mrp, b.ptr, validExpiry]
          );
          batchesUpdated++;
        } else {
          // Create new batch
          await client.query(
            `INSERT INTO product_batches (product_id, batch_no, stock_qty, mrp, ptr, expiry_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [productId, batchNo, b.stockQty, b.mrp, b.ptr, validExpiry]
          );
          batchesCreated++;
        }
      }

      // 3. Recalculate stock_qty for all updated products
      const validCodes = products.map((p: any) => (p.productCode || '').trim()).filter(Boolean);
      if (validCodes.length > 0) {
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
        `, [validCodes]);
      }

      if (importId) {
        await client.query(
          `UPDATE stock_imports SET status = 'completed', valid_rows = $2 WHERE id = $1`,
          [importId, totalRows]
        );
      }
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
