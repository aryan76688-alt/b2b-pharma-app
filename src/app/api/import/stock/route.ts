import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { parseMargStockData, parseMargDate, generateProductCode, ParsedProduct, ParsedBatch } from '@/lib/excel';

export const dynamic = 'force-dynamic';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const contentType = req.headers.get('content-type') || '';

    let fileName = 'STOCK_REPORT.xlsx';
    let totalRows = 0;
    let products: ParsedProduct[] = [];
    let batches: ParsedBatch[] = [];

    if (contentType.includes('multipart/form-data')) {
      // 1. Direct Multipart Form Upload (Files up to 50MB)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: { message: 'No file provided in form data.' } },
          { status: 400 }
        );
      }
      fileName = file.name || 'STOCK_REPORT.xlsx';
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseMargStockData(arrayBuffer);
      products = parsed.products;
      batches = parsed.batches;
      totalRows = parsed.totalRows;
    } else {
      // 2. JSON Payload (From Client-Side Preview or Chrome Extension Bridge)
      const body = await req.json();

      // Healthcheck / Connection test for MARG Bridge
      if (body?.ping) {
        return NextResponse.json({
          success: true,
          message: `Connected to Next.js B2B App (Authorized as ${owner.fullName || 'Owner'}).`
        });
      }

      fileName = body.fileName || 'STOCK_REPORT.xlsx';
      const rawProducts = body.products || [];
      const rawBatches = body.batches || [];
      totalRows = body.totalRows || rawProducts.length || 0;

      // Normalize products
      const pMap = new Map<string, ParsedProduct>();
      for (const p of rawProducts) {
        const rawCode = (p.productCode || p.code || '').trim();
        const rawName = (p.productName || p.name || '').trim();
        if (!rawCode && !rawName) continue;
        const code = rawCode || generateProductCode(rawName);

        if (!pMap.has(code)) {
          pMap.set(code, {
            productCode: code,
            productName: rawName || code,
            packing: p.packing || p.unit || '10x10',
            unit: p.unit || p.packing || 'PCS',
            company: p.company || 'Shreeji 7',
            costPrice: Math.max(0, parseFloat(String(p.costPrice || 0).replace(/,/g, '')) || 0),
            rackNo: (p.rackNo || '').trim(),
            category: 'Tablet'
          });
        }
      }
      products = Array.from(pMap.values());

      // Normalize & deduplicate batches: sum stock if duplicate batch
      const bMap = new Map<string, ParsedBatch>();
      for (const b of rawBatches) {
        const code = (b.productCode || b.code || '').trim();
        if (!code) continue;
        const rawBatch = (b.batchNo || b.batch || '').trim();
        const batchNo = rawBatch && rawBatch !== '-' && rawBatch !== '--' ? rawBatch : 'REGULAR';
        const stockQty = Math.round(parseFloat(String(b.stockQty ?? b.stock ?? 0).replace(/,/g, '')) || 0);
        const mrp = Math.max(0, parseFloat(String(b.mrp || 0).replace(/,/g, '')) || 0);
        const ptr = Math.max(0, parseFloat(String(b.ptr || b.salePrice || 0).replace(/,/g, '')) || 0);
        const expiryDate = parseMargDate(b.expiryDate || b.exp);

        const key = `${code}:::${batchNo}`;
        if (bMap.has(key)) {
          const existing = bMap.get(key)!;
          existing.stockQty += stockQty;
          if (mrp > 0) existing.mrp = mrp;
          if (ptr > 0) existing.ptr = ptr;
          if (expiryDate) existing.expiryDate = expiryDate;
        } else {
          bMap.set(key, {
            productCode: code,
            batchNo,
            stockQty,
            mrp,
            ptr,
            expiryDate
          });
        }
      }
      batches = Array.from(bMap.values());
    }

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'No valid products could be detected from the file or payload.' } },
        { status: 400 }
      );
    }

    let productsCreated = 0;
    let productsUpdated = 0;
    let batchesCreated = 0;
    let batchesUpdated = 0;
    let totalStockQty = 0;

    await withTransaction(async (client) => {
      // 1. Resolve safe owner UUID for stock_imports logging
      let safeOwnerId: string | null = null;
      if (owner?.id && isValidUuid(owner.id)) {
        safeOwnerId = owner.id;
      } else {
        const fallbackRes = await client.query(
          `SELECT id FROM users WHERE role IN ('owner', 'super_admin') ORDER BY created_at ASC LIMIT 1`
        );
        safeOwnerId = fallbackRes.rows[0]?.id || null;
      }

      let importId: string | null = null;
      if (safeOwnerId) {
        try {
          const metaRes = await client.query(
            `INSERT INTO stock_imports (uploaded_by, file_name, total_rows, status)
             VALUES ($1, $2, $3, 'processing')
             RETURNING id`,
            [safeOwnerId, fileName, totalRows]
          );
          importId = metaRes.rows[0]?.id || null;
        } catch (e) {
          // Non-blocking
        }
      }

      // 2. High-Performance Bulk Upsert Products in chunks of 100
      const PRODUCT_CHUNK_SIZE = 100;
      const touchedProductIds: string[] = [];

      for (let i = 0; i < products.length; i += PRODUCT_CHUNK_SIZE) {
        const chunk = products.slice(i, i + PRODUCT_CHUNK_SIZE);
        const valueClauses: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const p of chunk) {
          valueClauses.push(
            `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
          );
          params.push(
            p.productCode,
            p.productName,
            p.packing || '10x10',
            p.unit || 'PCS',
            p.company || 'Shreeji 7',
            0, // mrp initialized, recalculated from batches
            0, // ptr initialized, recalculated from batches
            0, // stock initialized, recalculated from batches
            p.costPrice || 0,
            p.rackNo || '',
            p.category || 'Tablet'
          );
        }

        const upsertProductsSql = `
          INSERT INTO products (product_code, product_name, packing, unit, company, mrp, ptr, stock_qty, cost_price, rack_no, category)
          VALUES ${valueClauses.join(', ')}
          ON CONFLICT (product_code) DO UPDATE
          SET product_name = EXCLUDED.product_name,
              packing = EXCLUDED.packing,
              unit = EXCLUDED.unit,
              company = EXCLUDED.company,
              cost_price = CASE WHEN EXCLUDED.cost_price > 0 THEN EXCLUDED.cost_price ELSE products.cost_price END,
              rack_no = CASE WHEN EXCLUDED.rack_no <> '' THEN EXCLUDED.rack_no ELSE products.rack_no END,
              updated_at = NOW()
          RETURNING id, product_code, (xmax = 0) AS is_inserted;
        `;

        const res = await client.query(upsertProductsSql, params);
        for (const row of res.rows) {
          touchedProductIds.push(row.id);
          if (row.is_inserted) {
            productsCreated++;
          } else {
            productsUpdated++;
          }
        }
      }

      // 3. Map all touched product codes to their database UUIDs
      const allProductCodes = Array.from(new Set(batches.map(b => b.productCode)));
      const codeToIdMap = new Map<string, string>();

      const codeMapRes = await client.query(
        `SELECT id, product_code FROM products WHERE product_code = ANY($1)`,
        [allProductCodes]
      );
      for (const row of codeMapRes.rows) {
        codeToIdMap.set(row.product_code, row.id);
      }

      // 4. Filter batches whose products exist and map to product_id
      const validBatches: { productId: string; batchNo: string; stockQty: number; mrp: number; ptr: number; expiryDate: string }[] = [];
      for (const b of batches) {
        const productId = codeToIdMap.get(b.productCode);
        if (!productId) continue;
        validBatches.push({
          productId,
          batchNo: b.batchNo,
          stockQty: b.stockQty,
          mrp: b.mrp,
          ptr: b.ptr,
          expiryDate: b.expiryDate
        });
        totalStockQty += b.stockQty;
      }

      // 5. Bulk Upsert Batches in chunks of 150
      const BATCH_CHUNK_SIZE = 150;
      for (let i = 0; i < validBatches.length; i += BATCH_CHUNK_SIZE) {
        const chunk = validBatches.slice(i, i + BATCH_CHUNK_SIZE);
        const valueClauses: string[] = [];
        const params: any[] = [];
        let bIdx = 1;

        for (const b of chunk) {
          valueClauses.push(`($${bIdx++}, $${bIdx++}, $${bIdx++}, $${bIdx++}, $${bIdx++}, $${bIdx++})`);
          params.push(
            b.productId,
            b.batchNo,
            b.stockQty,
            b.mrp,
            b.ptr,
            b.expiryDate
          );
        }

        const upsertBatchesSql = `
          INSERT INTO product_batches (product_id, batch_no, stock_qty, mrp, ptr, expiry_date)
          VALUES ${valueClauses.join(', ')}
          ON CONFLICT (product_id, batch_no) DO UPDATE
          SET stock_qty = EXCLUDED.stock_qty,
              mrp = EXCLUDED.mrp,
              ptr = EXCLUDED.ptr,
              expiry_date = COALESCE(EXCLUDED.expiry_date, product_batches.expiry_date),
              updated_at = NOW()
          RETURNING id, (xmax = 0) AS is_inserted;
        `;

        const res = await client.query(upsertBatchesSql, params);
        for (const row of res.rows) {
          if (row.is_inserted) {
            batchesCreated++;
          } else {
            batchesUpdated++;
          }
        }
      }

      // 6. Recalculate stock_qty, mrp, ptr for all touched products in a single SQL update
      if (touchedProductIds.length > 0) {
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
          WHERE id = ANY($1)
        `, [touchedProductIds]);
      }

      // 7. Update stock_imports status
      if (importId) {
        try {
          await client.query(
            `UPDATE stock_imports
             SET status = 'completed', valid_rows = $2
             WHERE id = $1`,
            [importId, totalRows]
          );
        } catch (e) {
          // Non-blocking
        }
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
        totalStockQty,
        purchasePriceImported: false
      }
    });

  } catch (error: any) {
    console.error('[Stock Import Error]', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to process stock import.' } },
      { status: 500 }
    );
  }
}
