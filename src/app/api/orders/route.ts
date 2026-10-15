import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { calculateOrderTotals } from '@/lib/utils';
import { logAudit } from '@/lib/audit';
import { triggerN8nWebhook } from '@/lib/n8n';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const partyId = searchParams.get('partyId');
    const salesmanId = searchParams.get('salesmanId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    // Salesman isolation: can ONLY see their own orders!
    if (user.role === 'salesman') {
      params.push(user.id);
      conditions.push(`o.salesman_id = $${params.length}`);
    } else if (salesmanId) {
      params.push(salesmanId);
      conditions.push(`o.salesman_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (partyId) {
      params.push(partyId);
      conditions.push(`o.party_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(o.order_number) LIKE $${pIdx} OR 
        LOWER(p.party_name) LIKE $${pIdx} OR 
        LOWER(p.city) LIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.party_id as "partyId",
        p.party_name as "partyName",
        p.city as "partyCity",
        p.area as "partyArea",
        o.salesman_id as "salesmanId",
        u.full_name as "salesmanName",
        o.status,
        o.order_date as "orderDate",
        o.delivery_date as "deliveryDate",
        o.subtotal,
        o.discount_amount as "discountAmount",
        o.total_amount as "totalAmount",
        o.total_quantity as "totalQuantity",
        o.total_free_quantity as "totalFreeQuantity",
        o.remarks,
        o.rejection_reason as "rejectionReason",
        o.created_at as "createdAt"
      FROM orders o
      JOIN parties p ON o.party_id = p.id
      JOIN users u ON o.salesman_id = u.id
      ${whereClause}
      ORDER BY o.order_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN parties p ON o.party_id = p.id
      ${whereClause}
    `;

    const [listRes, countRes] = await Promise.all([
      query(listQuery, [...params, limit, offset]),
      query(countQuery, params),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders: listRes.rows,
        pagination: {
          total: Number(countRes.rows[0]?.total || 0),
          page,
          limit,
          totalPages: Math.ceil(Number(countRes.rows[0]?.total || 0) / limit),
        },
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { partyId, items, remarks, deliveryDate, status = 'pending' } = body;

    if (!partyId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Party and at least one item are required.' } },
        { status: 400 }
      );
    }

    // Verify party exists
    const partyRes = await query(`SELECT id, party_name FROM parties WHERE id = $1 AND status = 'active'`, [partyId]);
    if (partyRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'PARTY_NOT_FOUND', message: 'Selected party is invalid or inactive.' } },
        { status: 404 }
      );
    }

    // Strict pharmaceutical order calculation
    const totals = calculateOrderTotals(items);

    // Salesman is user.id if salesman; if owner creates order, they can assign salesman or default to self
    const salesmanId = user.role === 'salesman' ? user.id : (body.salesmanId || user.id);

    // Generate unique order number (e.g. #ORD1289)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `#ORD${randomDigits}`;

    const newOrder = await withTransaction(async (client) => {
      // 1. Insert order
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, party_id, salesman_id, status, order_date, delivery_date,
          subtotal, discount_amount, total_amount, total_quantity, total_free_quantity, remarks
        ) VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, order_number as "orderNumber", status, total_amount as "totalAmount", total_quantity as "totalQuantity", total_free_quantity as "totalFreeQuantity"`,
        [
          orderNumber,
          partyId,
          salesmanId,
          status,
          deliveryDate || null,
          totals.subtotal,
          totals.discountAmount,
          totals.totalAmount,
          totals.totalQuantity,
          totals.totalFreeQuantity,
          remarks || null,
        ]
      );
      const order = orderRes.rows[0];

      // 2. Validate stock and insert order items with atomic stock decrement
      for (const item of items) {
        const qty = Math.max(0, Number(item.quantity) || 0);
        const freeQty = Math.max(0, Number(item.freeQuantity) || 0);
        const totalUnits = qty + freeQty;

        if (totalUnits <= 0) continue;

        // Check and decrement batch stock if batch specified
        if (item.batchId) {
          const batchRes = await client.query(
            `SELECT id, batch_no, stock_qty FROM product_batches WHERE id = $1 FOR UPDATE`,
            [item.batchId]
          );
          if (batchRes.rows.length === 0) {
            throw new Error(`Batch not found for product.`);
          }
          const batchStock = Number(batchRes.rows[0].stock_qty);
          if (batchStock < totalUnits) {
            throw new Error(
              `Insufficient stock for batch ${batchRes.rows[0].batch_no}. Available stock: ${batchStock}, requested: ${totalUnits}.`
            );
          }
          await client.query(
            `UPDATE product_batches SET stock_qty = stock_qty - $1, updated_at = now() WHERE id = $2`,
            [totalUnits, item.batchId]
          );
        }

        // Check and decrement master product stock
        const prodRes = await client.query(
          `SELECT id, product_name, stock_qty FROM products WHERE id = $1 FOR UPDATE`,
          [item.productId]
        );
        if (prodRes.rows.length === 0) {
          throw new Error(`Product not found.`);
        }
        const prodStock = Number(prodRes.rows[0].stock_qty);
        if (prodStock < totalUnits) {
          throw new Error(
            `Insufficient stock for ${prodRes.rows[0].product_name}. Available stock: ${prodStock}, requested: ${totalUnits}.`
          );
        }
        await client.query(
          `UPDATE products SET stock_qty = stock_qty - $1, updated_at = now() WHERE id = $2`,
          [totalUnits, item.productId]
        );

        const ptr = Math.max(0, Number(item.ptr) || 0);
        const mrp = Math.max(0, Number(item.mrp) || 0);
        const disc = Math.max(0, Number(item.discountAmount) || 0);
        const lineTotal = Math.max(0, qty * ptr - disc);

        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, batch_id, quantity, free_quantity, ptr, mrp, scheme_name, discount_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            order.id,
            item.productId,
            item.batchId || null,
            qty,
            freeQty,
            ptr,
            mrp,
            item.schemeName || null,
            disc,
            lineTotal,
          ]
        );
      }

      // 3. Insert status history
      await client.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
         VALUES ($1, NULL, $2, $3, $4)`,
        [order.id, status, user.id, status === 'pending' ? 'Order submitted by salesman' : 'Draft created']
      );

      return order;
    });

    // Notify owner about new order if submitted by salesman
    if (user.role === 'salesman' && status === 'pending') {
      const ownerRes = await query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
      if (ownerRes.rows.length > 0) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
           VALUES ($1, 'ORDER', 'New Order Received', $2, 'ORDER', $3)`,
          [
            ownerRes.rows[0].id,
            `New order ${newOrder.orderNumber} for ${partyRes.rows[0].party_name} submitted by ${user.fullName} (₹${totals.totalAmount.toFixed(2)}).`,
            newOrder.id,
          ]
        );
      }
    }

    await logAudit({
      userId: user.id,
      action: 'CREATE_ORDER',
      entityType: 'ORDER',
      entityId: newOrder.id,
      newData: { orderNumber: newOrder.orderNumber, totalAmount: totals.totalAmount, totalQuantity: totals.totalQuantity, totalFreeQuantity: totals.totalFreeQuantity },
    });

    // Trigger n8n automated dispatch webhook non-blocking
    triggerN8nWebhook('ORDER_CREATED', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      partyId,
      partyName: partyRes.rows[0].party_name,
      salesmanId,
      salesmanName: user.fullName,
      totalAmount: totals.totalAmount,
      totalQuantity: totals.totalQuantity,
      status,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: status === 'pending' ? 'Order submitted successfully! Pending owner approval.' : 'Draft saved.',
      data: newOrder,
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
